import { Global, Injectable, Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import type { SessionStamp } from "./session-token.js";

@Injectable()
export class SessionLookup {
  constructor(private readonly prisma: PrismaService) {}

  findStamp(userId: string): Promise<SessionStamp | null> {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { tokenVersion: true, passwordChangedAt: true, mustChangePassword: true },
    });
  }
}

/** Global so McpModule can inject the lookup into BearerVerifier. */
@Global()
@Module({
  providers: [PrismaService, SessionLookup],
  exports: [PrismaService, SessionLookup],
})
export class SessionModule {
  readonly label = "session";
}
