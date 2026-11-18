import { Injectable } from "@nestjs/common";
import { AuthRepository } from "./auth.repository.js";
import type { SessionStamp } from "./session.token.js";

@Injectable()
export class SessionLookup {
  constructor(private readonly users: AuthRepository) {}

  findStamp(userId: string): Promise<SessionStamp | null> {
    return this.users.findStamp(userId);
  }
}
