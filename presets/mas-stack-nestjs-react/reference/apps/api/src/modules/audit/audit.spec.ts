import { activityTypeFilter, requireAuditEventKey } from "@demo/contracts/audit";
import { describe, expect, it } from "vitest";
import { publicAuditMetadata } from "./audit.service.js";

describe("activity type filter", () => {
  it("lists a declared catalog event", () => {
    const login = activityTypeFilter().find((option) => option.key === "auth.login");
    expect(login).toEqual({
      key: "auth.login",
      i18nKey: "activity.events.auth.login",
      tone: "success",
    });
  });

  it("rejects an event key that is not in the catalog", () => {
    expect(() => requireAuditEventKey("language.changed")).toThrow(/undeclared audit event/);
  });

  it("rejects secret metadata keys", () => {
    expect(() => publicAuditMetadata({ password: "x" })).toThrow(/rejects password/);
  });
});
