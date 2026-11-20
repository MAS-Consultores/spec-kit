import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { readBrowserLocale, readLocaleCookie, useApplyLocale } from "../i18n/locale";
import type { AppShellProps } from "./types";

const SUPPORTED_LOCALES = ["es-CL"] as const;

export function AppShell({ items, children, onLogout }: AppShellProps): ReactElement {
  const { t } = useTranslation();
  useApplyLocale({
    preference: null,
    cookie: readLocaleCookie(typeof document === "undefined" ? null : document.cookie),
    browser: readBrowserLocale(typeof navigator === "undefined" ? null : navigator.language),
    organizationDefault: "es-CL",
    supported: SUPPORTED_LOCALES,
  });
  return (
    <div>
      <nav>
        {items.map((item) => (
          <span key={item.to}>{t(item.labelKey)}</span>
        ))}
        {onLogout ? (
          <button type="button" onClick={onLogout}>
            {t("logout")}
          </button>
        ) : null}
      </nav>
      {children}
    </div>
  );
}
