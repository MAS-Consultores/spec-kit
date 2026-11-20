import { describe, expect, it } from "vitest";
import { AuthRepository } from "./auth.repository.js";

describe("AuthRepository", () => {
  it("bumps the token version inside one transaction", async () => {
    const updates: unknown[] = [];
    const prisma = {
      $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
      refreshToken: { updateMany: () => Promise.resolve({ count: 1 }) },
      user: {
        update: (args: unknown) => {
          updates.push(args);
          return Promise.resolve({});
        },
      },
    };
    const repository = new AuthRepository(prisma as never);
    await repository.revokeSessions("user-1");
    expect(updates).toEqual([{ where: { id: "user-1" }, data: { tokenVersion: { increment: 1 } } }]);
  });
});
