import type { ConfigService } from "@nestjs/config";
import type { AppEnv } from "./env.js";

export function configString(config: ConfigService, name: keyof AppEnv): string {
  const value: unknown = config.get(name);
  if (typeof value !== "string") {
    throw new Error(`Missing ${name}. Add the variable to the config module and .env.example.`);
  }
  return value;
}

export function configNumber(config: ConfigService, name: keyof AppEnv): number {
  const value: unknown = config.get(name);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Missing ${name}. Add the variable to the config module and .env.example.`);
  }
  return value;
}
