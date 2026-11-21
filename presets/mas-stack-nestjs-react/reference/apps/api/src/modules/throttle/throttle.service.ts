import { Injectable } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import { SystemClock } from "../platform/index.js";
import { ThrottleRepository } from "./throttle.repository.js";

interface StorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class DbThrottlerStorage implements ThrottlerStorage {
  constructor(
    private readonly buckets: ThrottleRepository,
    private readonly clock: SystemClock,
  ) {}

  // ThrottlerStorage.increment is a five-argument interface. The names are not ours.
  // eslint-disable-next-line mas/max-callable-params -- contrato de ThrottlerStorage.increment, cinco argumentos que no son nuestros
  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    throttlerName: string,
  ): Promise<StorageRecord> {
    const row = await this.buckets.consume(`${throttlerName}:${key}`, ttl, limit);
    const timeToExpire = Math.max(0, row.expiresAt.getTime() - this.clock.now());
    return {
      totalHits: row.hits,
      timeToExpire,
      isBlocked: row.isBlocked,
      timeToBlockExpire: row.isBlocked ? timeToExpire : 0,
    };
  }
}
