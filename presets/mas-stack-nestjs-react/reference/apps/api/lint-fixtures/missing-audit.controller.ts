import { Controller, Post } from "@nestjs/common";

@Controller("settings")
export class LanguageController {
  @Post("language")
  changeLanguage(): { ok: true } {
    return { ok: true };
  }
}
