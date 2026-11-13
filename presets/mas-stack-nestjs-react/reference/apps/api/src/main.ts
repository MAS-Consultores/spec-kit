import "reflect-metadata";
import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.use(cookieParser());
  const port = Number(process.env["PORT"] ?? "0");
  await app.listen(port);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
