import type { Messages } from './site';
import { defaultLocale, htmlLangFor, localeMeta, locales } from './locale-config';
import type { Locale } from './locale-config';

export { defaultLocale, htmlLangFor, localeMeta, locales };
export type { Locale };

const messageModules = import.meta.glob<Messages>('../i18n/*.json', {
  eager: true,
  import: 'default'
});

export function getLocaleFromPath(pathValue: string): Locale {
  const match = locales.find((locale) => localeMeta[locale].path === pathValue);
  if (!match) throw new Error(`Unsupported docs locale path: ${pathValue}`);
  return match;
}

export function getLocaleUrl(locale: Locale): string {
  const localePath = localeMeta[locale].path;
  return localePath ? `/${localePath}/` : '/';
}

export function getMessages(locale: Locale): Messages {
  const fileName = locale === 'zh_CN' ? 'zh_CN' : locale === 'zh_TW' ? 'zh_TW' : locale;
  const messages = messageModules[`../i18n/${fileName}.json`];
  if (!messages) throw new Error(`Missing docs locale messages for ${locale}`);
  return messages;
}

export function canonicalUrlFor(locale: Locale): string {
  return `https://chatenhancer.com${getLocaleUrl(locale)}`;
}
