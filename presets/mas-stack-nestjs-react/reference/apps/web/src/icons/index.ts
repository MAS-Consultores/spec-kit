/**
 * Central icon module. Only this file may import the package named in
 * apps/web/ui.icons.json. Feature code imports icons from here.
 * lucide-react is the fallback when the HTML prototype defines no icon library.
 * When the prototype uses another library, change ui.icons.json and import
 * that official package here, one icon per import. Do not load a CDN script.
 */
export type IconName = string;
