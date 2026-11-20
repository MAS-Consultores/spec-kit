import { Controller, Post, BadRequestException } from "@nestjs/common";

@Controller("memos")
export class MemosController {
  @Post()
  create(): void {
    throw new BadRequestException("La nota no se pudo guardar");
  }
}
