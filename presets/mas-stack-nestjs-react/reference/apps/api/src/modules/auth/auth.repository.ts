import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/index.js";
import type { SessionStamp } from "./session.token.js";

export interface AuthUserRecord extends SessionStamp {
  id: string;
  passwordHash: string;
  permissions: { permission: { code: string } }[];
}

export interface RefreshRow {
  id: string;
  revokedAt: Date | null;
  expiresAt: Date;
  familyId: string;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { permissions: { include: { permission: true } } },
    });
  }

  findUserById(id: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { permissions: { include: { permission: true } } },
    });
  }

  findStamp(userId: string): Promise<SessionStamp | null> {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { tokenVersion: true, passwordChangedAt: true, mustChangePassword: true },
    });
  }

  findRefreshByHash(tokenHash: string): Promise<RefreshRow | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  revokeFamily(familyId: string): Promise<unknown> {
    return this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  revokeById(id: string): Promise<unknown> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  createRefresh(input: {
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<unknown> {
    return this.prisma.refreshToken.create({ data: input });
  }

  revokeSessions(userId: string): Promise<unknown> {
    return this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      }),
    ]);
  }
}
