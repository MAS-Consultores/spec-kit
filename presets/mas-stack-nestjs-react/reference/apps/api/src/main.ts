import "reflect-metadata";
import { Logger as NestLogger, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { trustProxySetting } from "./client-ip.js";
import { configNumber, configString } from "./config/read.js";

async function main(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.use(cookieParser());
  const config = app.get(ConfigService);
  const corsOrigin = configString(config, "CORS_ORIGIN");
  if (corsOrigin.length > 0) {
    app.enableCors({
      origin: corsOrigin.split(",").map((origin) => origin.trim()).filter((origin) => origin.length > 0),
      credentials: true,
    });
  }
  const trustProxy = trustProxySetting(configString(config, "TRUST_PROXY"));
  if (trustProxy !== false) {
    app.set("trust proxy", trustProxy);
  }
  const port = configNumber(config, "PORT");
  await app.listen(port);
}

main().catch((error: unknown) => {
  NestLogger.error(error instanceof Error ? error.message : "api failed to start");
  process.exit(1);
});
