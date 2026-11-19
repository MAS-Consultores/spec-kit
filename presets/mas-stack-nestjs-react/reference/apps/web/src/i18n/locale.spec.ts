import { describe, expect, it } from "vitest";
import { readLocaleCookie, resolveLocale } from "./locale";

const supported = ["es-CL", "en", "pt-BR", "fr-FR"] as const;

describe("resolveLocale", () => {
  it("prefers the person, then the cookie, then the browser, then the organization", () => {
    const base = {
      preference: "fr-FR",
      cookie: "pt-BR",
      browser: "en",
      organizationDefault: "es-CL",
      supported,
    };
    expect(resolveLocale(base)).toEqual({ locale: "fr-FR", source: "preference" });
    expect(resolveLocale({ ...base, preference: null })).toEqual({ locale: "pt-BR", source: "cookie" });
    expect(resolveLocale({ ...base, preference: null, cookie: null })).toEqual({
      locale: "en",
      source: "browser",
    });
    expect(resolveLocale({ ...base, preference: null, cookie: null, browser: "de" })).toEqual({
      locale: "es-CL",
      source: "organization",
    });
  });

  it("does not let the browser replace a supported cookie", () => {
    expect(
      resolveLocale({
        preference: null,
        cookie: "es-CL",
        browser: "en",
        organizationDefault: "en",
        supported,
      }),
    ).toEqual({ locale: "es-CL", source: "cookie" });
  });

  it("reads the locale cookie and ignores other cookies", () => {
    expect(readLocaleCookie("session=abc; locale=pt-BR")).toBe("pt-BR");
    expect(readLocaleCookie("session=abc")).toBeNull();
  });
});
