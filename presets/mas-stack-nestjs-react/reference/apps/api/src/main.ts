import "reflect-metadata";
import { VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";
import { configNumber, configString } from "./config/read.js";

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.use(cookieParser());
  const config = app.get(ConfigService);
  const corsOrigin = configString(config, "CORS_ORIGIN");
  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin.split(",").map((origin) => origin.trim()).filter((origin) => origin.length > 0),
      credentials: true,
    });
  }
  const port = configNumber(config, "PORT");
  await app.listen(port);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
