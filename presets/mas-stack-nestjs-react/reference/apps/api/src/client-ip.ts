import { isIP } from "node:net";

/** Hop count or loopback. `true` is rejected so X-Forwarded-For is never trusted blindly. */
export function trustProxySetting(raw: string): false | "loopback" | number {
  const value = raw.trim().toLowerCase();
  if (value === "" || value === "false" || value === "0") {
    return false;
  }
  if (value === "loopback") {
    return "loopback";
  }
  if (/^[1-9][0-9]*$/.test(value)) {
    return Number(value);
  }
  throw new Error(
    "Invalid TRUST_PROXY. Use loopback or a hop count. Add the variable to the config module and .env.example.",
  );
}

/** Address Express resolved onto `request.ip` after the configured trust-proxy setting. */
export function clientIp(request: { ip?: string | undefined }): string {
  const ip = request.ip;
  if (typeof ip !== "string" || isIP(ip) === 0) {
    return "";
  }
  return ip;
}
