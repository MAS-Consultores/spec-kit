import { useEffect } from "react";

const i18n = {
  language: "es-CL",
  changeLanguage(_language: string): Promise<void> {
    return Promise.resolve();
  },
};

export function useApplyLocale(): void {
  useEffect(() => {
    void i18n.changeLanguage(navigator.language);
  }, []);
}
