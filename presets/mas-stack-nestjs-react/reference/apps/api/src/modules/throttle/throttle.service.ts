import { Injectable } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import { ThrottleRepository } from "./throttle.repository.js";

interface StorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class DbThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly buckets: ThrottleRepository) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    throttlerName: string,
  ): Promise<StorageRecord> {
    const row = await this.buckets.hit(`${throttlerName}:${key}`, ttl);
    const timeToExpire = Math.max(0, row.expiresAt.getTime() - Date.now());
    const blocked = row.hits > limit;
    return {
      totalHits: row.hits,
      timeToExpire,
      isBlocked: blocked,
      timeToBlockExpire: blocked ? timeToExpire : 0,
    };
  }
}
