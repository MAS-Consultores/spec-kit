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

  // ThrottlerStorage.increment is a five-argument interface. The names are not ours.
  // eslint-disable-next-line max-params -- Nest throttler contract
  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    throttlerName: string,
  ): Promise<StorageRecord> {
    const row = await this.buckets.consume(`${throttlerName}:${key}`, ttl, limit);
    const timeToExpire = Math.max(0, row.expiresAt.getTime() - Date.now());
    return {
      totalHits: row.hits,
      timeToExpire,
      isBlocked: row.isBlocked,
      timeToBlockExpire: row.isBlocked ? timeToExpire : 0,
    };
  }
}
