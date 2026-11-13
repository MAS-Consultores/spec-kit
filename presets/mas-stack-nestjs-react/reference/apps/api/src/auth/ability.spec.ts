import { describe, expect, it } from "vitest";
import { createAppAbility } from "./ability.js";

describe("createAppAbility", () => {
  it("allows only the scopes that were granted", () => {
    const ability = createAppAbility(["notes:ver"]);
    expect(ability.can("notes:ver", "Note")).toBe(true);
    expect(ability.can("notes:eliminar", "Note")).toBe(false);
  });
});
