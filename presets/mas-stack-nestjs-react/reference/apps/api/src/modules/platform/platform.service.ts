import { randomBytes, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";

/** Wall clock. Services inject this instead of calling Date.now(). */
@Injectable()
export class SystemClock {
  now(): number {
    return Date.now();
  }
}

export type Clock = Pick<SystemClock, "now">;

/** Identifiers and random bytes. Services inject this instead of node:crypto. */
@Injectable()
export class SystemIdGenerator {
  uuid(): string {
    return randomUUID();
  }

  bytes(size: number): Buffer {
    return randomBytes(size);
  }
}

export type IdGenerator = Pick<SystemIdGenerator, "uuid" | "bytes">;
