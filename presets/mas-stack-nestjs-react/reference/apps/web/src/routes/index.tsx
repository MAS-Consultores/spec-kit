import { Button } from "@demo/ui/components/button";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { formatDate, formatNumber, formatRut } from "../format";

export function Home(): ReactElement {
  const { t } = useTranslation();
  return (
    <main>
      <h1>{t("title")}</h1>
      <p>
        {t("rutLabel")}: {formatRut("123456785")}
      </p>
      <p>
        {t("dateLabel")}: {formatDate(new Date("2026-11-13T00:00:00Z"))}
      </p>
      <p>
        {t("numberLabel")}: {formatNumber(1234.5)}
      </p>
      <Button type="button">{t("create")}</Button>
    </main>
  );
}
