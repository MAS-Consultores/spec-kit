import { z } from "zod";

export type AppEnv = {
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  LOGIN_THROTTLE_LIMIT: number;
  PORT: number;
  CORS_ORIGIN: string;
  TRUST_PROXY: string;
  LOG_LEVEL: string;
  NODE_ENV: string;
};

/** MCP HTTP stays off unless the process opts in. Projects without tools leave it unset. */
export function mcpEnabled(source: NodeJS.ProcessEnv = process.env): boolean {
  const value = source["MCP_ENABLED"];
  return value === "true" || value === "1";
}

function requiredText(value: string | undefined, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Missing ${name}. Add the variable to the config module and .env.example.`,
    );
  }
  return value;
}

function optionalNumber(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = z.number().int().nonnegative().safeParse(Number(value));
  if (!parsed.success) {
    throw new Error(
      `Invalid ${name}. Add the variable to the config module and .env.example.`,
    );
  }
  return parsed.data;
}

/** The only product helper that reads the environment. Callers use ConfigService. */
export function readAppEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const databaseUrl = source["DATABASE_URL"];
  const accessSecret = source["JWT_ACCESS_SECRET"];
  const refreshSecret = source["JWT_REFRESH_SECRET"];
  const throttle = source["LOGIN_THROTTLE_LIMIT"];
  const port = source["PORT"];
  const corsOrigin = source["CORS_ORIGIN"];
  const trustProxy = source["TRUST_PROXY"];
  const logLevel = source["LOG_LEVEL"];
  const nodeEnv = source["NODE_ENV"];
  return {
    DATABASE_URL: requiredText(databaseUrl, "DATABASE_URL"),
    JWT_ACCESS_SECRET: requiredText(accessSecret, "JWT_ACCESS_SECRET"),
    JWT_REFRESH_SECRET: requiredText(refreshSecret, "JWT_REFRESH_SECRET"),
    LOGIN_THROTTLE_LIMIT: optionalNumber(throttle, 1000, "LOGIN_THROTTLE_LIMIT"),
    PORT: optionalNumber(port, 0, "PORT"),
    CORS_ORIGIN: typeof corsOrigin === "string" ? corsOrigin : "",
    TRUST_PROXY: typeof trustProxy === "string" ? trustProxy : "",
    LOG_LEVEL: typeof logLevel === "string" && logLevel.length > 0 ? logLevel : "info",
    NODE_ENV: typeof nodeEnv === "string" && nodeEnv.length > 0 ? nodeEnv : "development",
  };
}
