/**
 * Browser-native localization helpers shared by extension-owned pages.
 */
const languageDisplayNamesByLocale = new Map<string, Intl.DisplayNames | null>();

export function localizeExtensionPage(preserveExistingCopy = false): string {
  const locale = getBrowserUiLocale();
  document.documentElement.lang = locale;
  document.documentElement.dir = getExtensionTextDirection(locale);

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (key) {
      const fallback = preserveExistingCopy ? element.textContent || key : key;
      element.textContent = getExtensionMessage(key, undefined, fallback);
    }
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((element) => {
    const key = element.dataset.i18nTitle;
    if (key) {
      const fallback = preserveExistingCopy ? element.title || key : key;
      element.title = getExtensionMessage(key, undefined, fallback);
    }
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    if (key) {
      const fallback = preserveExistingCopy
        ? element.getAttribute('aria-label') || key
        : key;
      element.setAttribute(
        'aria-label',
        getExtensionMessage(key, undefined, fallback)
      );
    }
  });

  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-placeholder]')
    .forEach((element) => {
      const key = element.dataset.i18nPlaceholder;
      if (key) {
        const fallback = preserveExistingCopy ? element.placeholder || key : key;
        element.placeholder = getExtensionMessage(key, undefined, fallback);
      }
    });

  return locale;
}

export function getExtensionTextDirection(locale: string): 'ltr' | 'rtl' {
  const language = locale.trim().toLowerCase().replaceAll('_', '-').split('-')[0];
  return ['ar', 'fa', 'he', 'iw', 'ur'].includes(language) ? 'rtl' : 'ltr';
}

export function getBrowserUiLocale(): string {
  return (
    (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage?.()) ||
    navigator.language ||
    'en'
  );
}

export function getExtensionMessage(
  key: string,
  substitutions?: string | string[],
  fallback = key
): string {
  const message =
    typeof chrome !== 'undefined' ? chrome.i18n?.getMessage?.(key, substitutions) : '';
  return message && message !== key ? message : fallback;
}

export function getLocalizedLanguageLabel(languageCode: string, locale: string): string {
  let displayNames = languageDisplayNamesByLocale.get(locale);
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames([locale], { type: 'language' });
      languageDisplayNamesByLocale.set(locale, displayNames);
    } catch {
      languageDisplayNamesByLocale.set(locale, null);
      return '';
    }
  }

  try {
    const displayName = displayNames?.of(languageCode);
    if (displayName) return displayName;
  } catch {
    // Fall back to the static English catalog from LANGUAGE_OPTIONS.
  }

  return '';
}
