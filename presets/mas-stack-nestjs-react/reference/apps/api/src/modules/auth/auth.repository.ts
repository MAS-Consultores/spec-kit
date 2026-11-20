import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/index.js";
import type { SessionStamp } from "./session.token.js";

export interface AuthUserRecord extends SessionStamp {
  id: string;
  passwordHash: string | null;
  /** Omitted on the skeleton user. `false` rejects the login after Argon2. */
  isActive?: boolean;
  /** `true` rejects the login after Argon2. `isBlocked` is the same gate. */
  isLocked?: boolean;
  isBlocked?: boolean;
  /** `false` means a required email is missing or unverified. */
  isEmailVerified?: boolean;
  permissions: { permission: { code: string } }[];
}

function toRecord(row: {
  id: string;
  passwordHash: string | null;
  tokenVersion: number;
  passwordChangedAt: Date | null;
  permissions: { permission: { code: string } }[];
} & Record<"mustChangePassword", boolean>): AuthUserRecord {
  return {
    id: row.id,
    passwordHash: row.passwordHash,
    tokenVersion: row.tokenVersion,
    passwordChangedAt: row.passwordChangedAt,
    shouldChangePassword: row["mustChangePassword"],
    permissions: row.permissions,
  };
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

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const row = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { permissions: { include: { permission: true } } },
    });
    return row === null ? null : toRecord(row);
  }

  async findUserById(id: string): Promise<AuthUserRecord | null> {
    const row = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { permissions: { include: { permission: true } } },
    });
    return row === null ? null : toRecord(row);
  }

  async findStamp(userId: string): Promise<SessionStamp | null> {
    const row = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { tokenVersion: true, passwordChangedAt: true, mustChangePassword: true },
    });
    if (row === null) return null;
    return {
      tokenVersion: row.tokenVersion,
      passwordChangedAt: row.passwordChangedAt,
      shouldChangePassword: row.mustChangePassword,
    };
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
