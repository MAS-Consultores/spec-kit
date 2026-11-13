import { describe, expect, it } from "vitest";
import { createAppAbility } from "../../auth/ability.js";
import { NotesService } from "./notes.service.js";

describe("NotesService", () => {
  it("refuses to create when the ability lacks notes:crear", async () => {
    const service = new NotesService({
      $transaction: () => Promise.reject(new Error("db")),
    } as unknown as ConstructorParameters<typeof NotesService>[0]);
    const ability = createAppAbility(["notes:ver"]);
    expect(ability.can("notes:crear", "Note")).toBe(false);
    await expect(service.create(["notes:ver"], { title: "a", body: "b" }, "user")).rejects.toThrow(
      "forbidden",
    );
  });
});
