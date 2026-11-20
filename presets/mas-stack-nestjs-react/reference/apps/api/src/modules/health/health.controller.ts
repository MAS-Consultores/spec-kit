import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/index.js";

@Controller("health")
export class HealthController {
  @Public()
  @Get()
  health(): { isOk: true } {
    return { isOk: true };
  }
}
