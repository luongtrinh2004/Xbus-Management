import { setDefaultOptions } from "date-fns";
import { enUS, vi } from "date-fns/locale";

let displayLanguage = "vi-VN";

/** Configure display helpers only; stored names and API dates stay unchanged. */
export function setDisplayLanguage(language: string): void {
  displayLanguage = language;
  setDefaultOptions({ locale: language === "vi-VN" ? vi : enUS, weekStartsOn: 1 });
}

export function getDisplayLanguage(): string {
  return displayLanguage;
}
