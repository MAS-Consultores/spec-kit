import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readAppEnv } from "./env.js";

/**
 * Zod validation runs when Nest creates this provider, which is
 * NestFactory.create, not when the file is imported. `ConfigModule.forRoot`
 * in @nestjs/config 12 starts reading the environment at the import, so a
 * test that sets variables in `beforeAll` would validate the old values.
 */
@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: (): ConfigService => new ConfigService(readAppEnv()),
    },
  ],
  exports: [ConfigService],
})
export class AppConfigModule {
  readonly label = "config";
}
