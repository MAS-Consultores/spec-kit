import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import esCL from "./locales/es-CL.json";

void i18n.use(initReactI18next).init({
  lng: "es-CL",
  resources: { "es-CL": { translation: esCL } },
  interpolation: { escapeValue: false },
});

export { i18n };
