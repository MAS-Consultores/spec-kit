import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import type { AppShellProps } from "./types";

export function AppShell({ items, children, onLogout }: AppShellProps): ReactElement {
  const { t } = useTranslation();
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
