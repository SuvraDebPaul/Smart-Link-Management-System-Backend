import { createHmac } from "node:crypto";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import config from "../../config/index.js";
import type { TNotificationType } from "./notification.interface.js";

const webhookTimeoutMs = 5000;

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

const isPublicIp = (address: string) => {
  const version = isIP(address);

  if (version === 4) return !isPrivateIpv4(address);
  if (version === 6) return !isPrivateIpv6(address);

  return false;
};

const resolvePublicAddress = async (hostname: string) => {
  if (hostname.toLowerCase() === "localhost") {
    throw new Error("Webhook hostname is not allowed");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });

  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error("Webhook hostname must resolve only to public IP addresses");
  }

  return addresses[0]!;
};

const parseWebhookUrl = (webhookUrl: string) => {
  const url = new URL(webhookUrl);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Webhook URL must use HTTP or HTTPS");
  }

  if (url.username || url.password) {
    throw new Error("Webhook URL credentials are not allowed");
  }

  return url;
};

const validateWebhookDestination = async (webhookUrl: string) => {
  if (!config.webhook_signing_secret) {
    throw new Error("Webhook signing secret is not configured");
  }

  const url = parseWebhookUrl(webhookUrl);

  await resolvePublicAddress(url.hostname);
};

const signPayload = (payload: string) => {
  if (!config.webhook_signing_secret) {
    throw new Error("Webhook signing secret is not configured");
  }

  return createHmac("sha256", config.webhook_signing_secret)
    .update(payload)
    .digest("hex");
};

const deliverNotificationWebhook = async (
  webhookUrl: string,
  notification: {
    type: TNotificationType;
    title: string;
    message: string;
    eventKey: string;
    createdAt: string;
  },
) => {
  const url = parseWebhookUrl(webhookUrl);
  const resolvedAddress = await resolvePublicAddress(url.hostname);
  const payload = JSON.stringify({
    event: notification.type,
    notification,
  });
  const signature = signPayload(payload);
  const requestClient = url.protocol === "https:" ? https : http;

  await new Promise<void>((resolve, reject) => {
    const request = requestClient.request(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
          "user-agent": "SmartLink-Webhook/1.0",
          "x-smartlink-signature": `sha256=${signature}`,
        },
        lookup: (_hostname, _options, callback) => {
          callback(null, resolvedAddress.address, resolvedAddress.family);
        },
        timeout: webhookTimeoutMs,
      },
      (response) => {
        response.resume();

        if (
          response.statusCode &&
          response.statusCode >= 200 &&
          response.statusCode < 300
        ) {
          resolve();
          return;
        }

        reject(
          new Error(`Webhook endpoint returned ${response.statusCode ?? "unknown"}`),
        );
      },
    );

    request.on("timeout", () => request.destroy(new Error("Webhook timed out")));
    request.on("error", reject);
    request.end(payload);
  });
};

export const WebhookDeliveryServices = {
  deliverNotificationWebhook,
  validateWebhookDestination,
};
