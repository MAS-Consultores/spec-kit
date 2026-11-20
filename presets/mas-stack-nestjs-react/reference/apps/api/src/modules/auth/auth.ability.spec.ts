import { describe, expect, it } from "vitest";
import { createAppAbility } from "./auth.ability.js";

describe("createAppAbility", () => {
  it("allows only the scopes that were granted", () => {
    const ability = createAppAbility(["audits:ver"]);
    expect(ability.can("audits:ver", "Audit")).toBe(true);
    expect(ability.can("audits:eliminar", "Audit")).toBe(false);
  });
});
