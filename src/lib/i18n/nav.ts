import type { AppLocale } from "./constants";
import { messages } from "./messages";

export function navLabels(locale: AppLocale) {
  return messages[locale]?.nav ?? messages.uz.nav;
}
