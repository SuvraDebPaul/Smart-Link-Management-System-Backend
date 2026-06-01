import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";

const redirectStatusCodes = new Set([301, 302, 303, 307, 308]);

const isPrivateIpv4 = (address: string) => {
  const [first = 0, second = 0, third = 0] = address.split(".").map(Number);

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 88 && third === 99) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
};

const isPrivateIpv6 = (address: string) => {
  const normalized = address.toLowerCase();

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:") ||
    normalized.startsWith("::ffff:")
  );
};

export const isPublicIp = (address: string) => {
  const version = isIP(address);

  if (version === 4) return !isPrivateIpv4(address);
  if (version === 6) return !isPrivateIpv6(address);

  return false;
};

export const parsePublicHttpUrl = (value: string) => {
  const url = new URL(value);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Destination URL must use HTTP or HTTPS");
  }

  if (url.username || url.password) {
    throw new Error("Destination URL credentials are not allowed");
  }

  return url;
};

export const resolvePublicAddress = async (hostname: string) => {
  if (hostname.toLowerCase() === "localhost") {
    throw new Error("Destination hostname is not allowed");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });

  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => !isPublicIp(address))
  ) {
    throw new Error("Destination hostname must resolve only to public IP addresses");
  }

  return addresses[0]!;
};

export const requestPublicHttpHead = async (
  value: string,
  redirectsRemaining = 5,
): Promise<number> => {
  const url = parsePublicHttpUrl(value);
  const resolvedAddress = await resolvePublicAddress(url.hostname);
  const requestClient = url.protocol === "https:" ? https : http;

  return new Promise<number>((resolve, reject) => {
    const request = requestClient.request(
      url,
      {
        method: "HEAD",
        lookup: (_hostname, _options, callback) => {
          callback(null, resolvedAddress.address, resolvedAddress.family);
        },
        timeout: 7000,
      },
      (response) => {
        const statusCode = response.statusCode ?? 0;
        const location = response.headers.location;
        response.resume();

        if (redirectStatusCodes.has(statusCode) && location) {
          if (redirectsRemaining <= 0) {
            reject(new Error("Destination URL redirected too many times"));
            return;
          }

          requestPublicHttpHead(
            new URL(location, url).toString(),
            redirectsRemaining - 1,
          ).then(resolve, reject);
          return;
        }

        resolve(statusCode);
      },
    );

    request.on("timeout", () =>
      request.destroy(new Error("Destination request timed out")),
    );
    request.on("error", reject);
    request.end();
  });
};
