import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { configString } from "../config/read.js";
import { pinoHttpOptions } from "./pino-options.js";

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: pinoHttpOptions({
          LOG_LEVEL: configString(config, "LOG_LEVEL"),
          NODE_ENV: configString(config, "NODE_ENV"),
        }),
      }),
    }),
  ],
})
export class LoggingModule {
  readonly label = "logging";
}
