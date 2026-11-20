import { Controller, Post } from "@nestjs/common";

function Audit(_eventKey: string): MethodDecorator {
  return () => undefined;
}

@Controller("settings")
export class LanguageController {
  @Post("language")
  @Audit("language.changed")
  changeLanguage(): { ok: true } {
    return { ok: true };
  }
}
