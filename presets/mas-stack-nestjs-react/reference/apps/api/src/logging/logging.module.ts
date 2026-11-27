import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { configNumber, configString } from "../config/read.js";
import { pinoHttpOptions } from "./pino-options.js";

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: pinoHttpOptions({
          LOG_LEVEL: configString(config, "LOG_LEVEL"),
          NODE_ENV: configString(config, "NODE_ENV"),
          LOG_FILE: configString(config, "LOG_FILE"),
          LOG_FILE_RETENTION_DAYS: configNumber(config, "LOG_FILE_RETENTION_DAYS"),
        }),
      }),
    }),
  ],
})
export class LoggingModule {
  readonly label = "logging";
}
