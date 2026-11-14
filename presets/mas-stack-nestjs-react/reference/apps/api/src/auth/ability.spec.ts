import { describe, expect, it } from "vitest";
import { createAppAbility } from "./ability.js";

describe("createAppAbility", () => {
  it("allows only the scopes that were granted", () => {
    const ability = createAppAbility(["widgets:ver"]);
    expect(ability.can("widgets:ver", "Widget")).toBe(true);
    expect(ability.can("widgets:eliminar", "Widget")).toBe(false);
  });
});
