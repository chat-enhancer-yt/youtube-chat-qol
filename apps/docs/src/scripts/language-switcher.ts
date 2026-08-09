import { locales } from "@chatenhancer/product-config/locales";
import type { Locale } from "@chatenhancer/product-config/locales";

export function setupLanguageSwitchers(root: ParentNode = document) {
  const destinations = Array.from(
    root.querySelectorAll<HTMLAnchorElement>("[data-language-destination]")
  );

  root.querySelectorAll<HTMLSelectElement>("[data-language-switcher]").forEach((switcher) => {
    switcher.addEventListener("change", () => {
      const locale = getSelectedLocale(switcher);
      if (!locale) return;

      const destination = destinations.find(
        (link) => link.dataset.languageDestination === locale
      );
      if (!isSafeDestination(destination)) return;

      document.cookie = `ce_lang=${encodeURIComponent(locale)}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
      destination.click();
    });
  });
}

function getSelectedLocale(switcher: HTMLSelectElement): Locale | null {
  const value = switcher.selectedOptions[0]?.value;
  return locales.includes(value as Locale) ? value as Locale : null;
}

function isSafeDestination(
  destination: HTMLAnchorElement | undefined
): destination is HTMLAnchorElement {
  return Boolean(
    destination &&
    destination.protocol === window.location.protocol &&
    destination.origin === window.location.origin
  );
}
