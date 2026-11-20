import { Controller, Post, BadRequestException } from "@nestjs/common";

@Controller("notes")
export class NotesController {
  @Post()
  create(): void {
    throw new BadRequestException("La nota no se pudo guardar");
  }
}
