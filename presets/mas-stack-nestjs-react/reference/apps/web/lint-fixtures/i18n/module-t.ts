declare function t(key: string): string;
const i18n = { t };

export const title = t("title");
export const nav = [{ labelKey: "logout", label: i18n.t("logout") }];
