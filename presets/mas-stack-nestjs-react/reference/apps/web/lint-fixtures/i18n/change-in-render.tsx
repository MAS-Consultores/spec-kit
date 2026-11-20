import type { ReactElement } from "react";

declare function changeLanguage(language: string): Promise<void>;
const i18n = { changeLanguage, language: "es-CL" };

export function LoginForm(): ReactElement {
  void i18n.changeLanguage(navigator.language);
  return <button type="button"> </button>;
}
