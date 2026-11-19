import { useEffect } from "react";
import { i18n } from "../i18n";

export const LOCALE_COOKIE = "locale";

export interface LocaleInput {
  readonly preference?: string | null;
  readonly cookie?: string | null;
  readonly browser?: string | null;
  readonly organizationDefault: string;
  readonly supported: readonly string[];
}

export type LocaleSource = "preference" | "cookie" | "browser" | "organization";

export interface ResolvedLocale {
  readonly locale: string;
  readonly source: LocaleSource;
}

function normalize(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return trimmed.replaceAll("_", "-");
}

function pick(value: string | null | undefined, supported: ReadonlySet<string>): string | null {
  const next = normalize(value);
  if (next == null || !supported.has(next)) return null;
  return next;
}

/** Preference, then the locale cookie, then the browser, then the organization default. Exact tags only. */
export function resolveLocale(input: LocaleInput): ResolvedLocale {
  const supported = new Set(input.supported);
  const preference = pick(input.preference, supported);
  if (preference != null) return { locale: preference, source: "preference" };
  const cookie = pick(input.cookie, supported);
  if (cookie != null) return { locale: cookie, source: "cookie" };
  const browser = pick(input.browser, supported);
  if (browser != null) return { locale: browser, source: "browser" };
  return { locale: input.organizationDefault, source: "organization" };
}

export function readLocaleCookie(cookie: string | null | undefined): string | null {
  if (cookie == null || cookie === "") return null;
  const parts = cookie.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${LOCALE_COOKIE}=`));
  if (match == null) return null;
  return decodeURIComponent(match.slice(LOCALE_COOKIE.length + 1));
}

export function readBrowserLocale(language: string | null | undefined): string | null {
  return normalize(language);
}

export function useApplyLocale(input: LocaleInput): void {
  const { preference, cookie, browser, organizationDefault, supported } = input;
  useEffect(() => {
    const next = resolveLocale({
      preference,
      cookie,
      browser,
      organizationDefault,
      supported,
    }).locale;
    if (i18n.language !== next) {
      void i18n.changeLanguage(next);
    }
  }, [preference, cookie, browser, organizationDefault, supported]);
}
