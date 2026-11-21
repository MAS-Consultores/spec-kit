import { Module } from "@nestjs/common";
import { SystemClock, SystemIdGenerator } from "./platform.service.js";

@Module({
  providers: [SystemClock, SystemIdGenerator],
  exports: [SystemClock, SystemIdGenerator],
})
export class PlatformModule {
  readonly label = "platform";
}
