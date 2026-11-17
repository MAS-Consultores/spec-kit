import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { readAppEnv, type AppEnv } from "./env.js";

function asProcessEnv(value: unknown): NodeJS.ProcessEnv {
  const source: NodeJS.ProcessEnv = {};
  if (typeof value !== "object" || value === null) return source;
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") source[key] = item;
  }
  return source;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      cache: true,
      validate: (env: Record<string, unknown>): AppEnv => readAppEnv(asProcessEnv(env)),
    }),
  ],
})
export class AppConfigModule {
  readonly label = "config";
}
