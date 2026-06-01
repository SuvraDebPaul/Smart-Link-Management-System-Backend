import assert from "node:assert/strict";
import test from "node:test";
import { isPublicIp, parsePublicHttpUrl } from "./public-http.js";

test("isPublicIp rejects private and reserved addresses", () => {
  assert.equal(isPublicIp("127.0.0.1"), false);
  assert.equal(isPublicIp("169.254.169.254"), false);
  assert.equal(isPublicIp("192.168.1.10"), false);
  assert.equal(isPublicIp("::1"), false);
  assert.equal(isPublicIp("8.8.8.8"), true);
});

test("parsePublicHttpUrl accepts public HTTP shapes and rejects credentials", () => {
  assert.equal(parsePublicHttpUrl("https://example.com/path").hostname, "example.com");
  assert.throws(() => parsePublicHttpUrl("ftp://example.com/file"));
  assert.throws(() => parsePublicHttpUrl("https://user:secret@example.com"));
});
