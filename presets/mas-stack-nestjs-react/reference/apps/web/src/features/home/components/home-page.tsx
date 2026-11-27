import { Button } from "@demo/ui/components/button";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { formatDate, formatNumber, formatRut } from "../../../format";

const SAMPLE_AMOUNT = 1234.5;

export function HomePage(): ReactElement {
  const { t, i18n } = useTranslation();
  return (
    <main>
      <h1>{t("title")}</h1>
      <p>
        {t("rutLabel")}: {formatRut("123456785")}
      </p>
      <p>
        {t("dateLabel")}: {formatDate(new Date("2026-11-13T00:00:00Z"), i18n.language)}
      </p>
      <p>
        {t("numberLabel")}: {formatNumber(SAMPLE_AMOUNT, i18n.language)}
      </p>
      <Button type="button">{t("create")}</Button>
    </main>
  );
}
