import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/index.js";

interface BucketRow {
  hits: number;
  expires_at: Date;
}

export interface BucketDecision {
  hits: number;
  expiresAt: Date;
  blocked: boolean;
}

@Injectable()
export class ThrottleRepository {
  constructor(private readonly prisma: PrismaService) {}

  consume(key: string, ttlMs: number, limit: number): Promise<BucketDecision> {
    return this.prisma.$transaction((tx) => this.lockedConsume(tx, key, ttlMs, limit));
  }

  private async lockedConsume(
    tx: Pick<PrismaService, "$executeRaw" | "$queryRaw">,
    key: string,
    ttlMs: number,
    limit: number,
  ): Promise<BucketDecision> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    await tx.$executeRaw`DELETE FROM rate_limit_buckets WHERE expires_at <= NOW()`;
    const rows = await tx.$queryRaw<BucketRow[]>`
      INSERT INTO rate_limit_buckets (key, hits, expires_at)
      VALUES (${key}, 1, NOW() + (${ttlMs} * INTERVAL '1 millisecond'))
      ON CONFLICT (key) DO UPDATE SET
        hits = CASE
          WHEN rate_limit_buckets.expires_at <= NOW() THEN 1
          ELSE rate_limit_buckets.hits + 1
        END,
        expires_at = CASE
          WHEN rate_limit_buckets.expires_at <= NOW() THEN NOW() + (${ttlMs} * INTERVAL '1 millisecond')
          ELSE rate_limit_buckets.expires_at
        END
      RETURNING hits, expires_at
    `;
    const row = rows[0];
    if (!row) {
      throw new Error("rate limit bucket was not written");
    }
    return { hits: row.hits, expiresAt: row.expires_at, blocked: row.hits > limit };
  }
}
