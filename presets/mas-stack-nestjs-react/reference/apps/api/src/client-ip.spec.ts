import { describe, expect, it } from "vitest";
import { clientIp, trustProxySetting } from "./client-ip.js";

describe("client IP", () => {
  it("reads request.ip and does not accept a raw forwarded list", () => {
    expect(clientIp({ ip: "127.0.0.1" })).toBe("127.0.0.1");
    expect(clientIp({ ip: "1.2.3.4, 10.0.0.1" })).toBe("");
    expect(clientIp({})).toBe("");
  });

  it("accepts only an explicit trust-proxy setting", () => {
    expect(trustProxySetting("")).toBe(false);
    expect(trustProxySetting("false")).toBe(false);
    expect(trustProxySetting("loopback")).toBe("loopback");
    expect(trustProxySetting("2")).toBe(2);
    expect(() => trustProxySetting("true")).toThrow(/TRUST_PROXY/);
  });
});
