import { defaultLocale, localeMeta, locales } from '../../../docs/src/data/locale-config';

const DEFAULT_LOCALE = defaultLocale;
const LANGUAGE_COOKIE = 'ce_lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const SUPPORTED_LOCALES = new Set<string>(
  locales.map((locale) => localeMeta[locale].path || locale)
);
const LOCALIZED_PATH_SEGMENTS = new Set(
  Array.from(SUPPORTED_LOCALES)
    .filter((locale) => locale !== DEFAULT_LOCALE)
    .map((locale) => locale.toLowerCase())
);

interface LanguagePreference {
  locale: string;
  quality: number;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (!shouldHandleRequest(request, url)) {
      return fetch(request);
    }

    const explicitLocale = normalizeLocale(url.searchParams.get('lang') || url.searchParams.get('hl'));
    if (explicitLocale) {
      return redirectToLocalePage(request, url, explicitLocale, true);
    }

    const cookieLocale = normalizeLocale(getCookie(request, LANGUAGE_COOKIE));
    const headerLocale = pickAcceptLanguage(request.headers.get('Accept-Language'));
    const preferredLocale = cookieLocale || headerLocale;

    if (!preferredLocale || preferredLocale === DEFAULT_LOCALE) {
      return fetchPage(request);
    }

    return redirectToLocalePage(request, url, preferredLocale, false);
  }
};

export function shouldHandleRequest(request: Request, url: URL): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  if (!isPagePath(url.pathname) || hasLocalePathPrefix(url.pathname)) return false;
  const fetchDestination = request.headers.get('Sec-Fetch-Dest');
  if (fetchDestination && fetchDestination !== 'document' && fetchDestination !== 'iframe') return false;
  if (isBot(request.headers.get('User-Agent'))) return false;
  return true;
}

function isPagePath(pathname: string): boolean {
  const lastSegment = pathname.split('/').pop() || '';
  return !lastSegment.includes('.') || lastSegment.endsWith('.html');
}

function hasLocalePathPrefix(pathname: string): boolean {
  const firstSegment = pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
  return LOCALIZED_PATH_SEGMENTS.has(firstSegment);
}

async function redirectToLocalePage(
  request: Request,
  url: URL,
  locale: string,
  removeLanguageParams: boolean
): Promise<Response> {
  const destinationUrl = createLocalePageUrl(url, locale, removeLanguageParams);
  if (locale === DEFAULT_LOCALE) return createRedirect(destinationUrl, locale);

  const localePageExists = await localePageExistsAt(request, destinationUrl);
  if (!localePageExists) return fetchPage(request);

  return createRedirect(destinationUrl, locale);
}

function createLocalePageUrl(url: URL, locale: string, removeLanguageParams: boolean): URL {
  const destinationUrl = new URL(url);
  const pagePath = url.pathname === '/index.html' ? '/' : url.pathname;
  destinationUrl.pathname = locale === DEFAULT_LOCALE ? pagePath : `/${locale}${pagePath}`;
  if (removeLanguageParams) {
    destinationUrl.searchParams.delete('lang');
    destinationUrl.searchParams.delete('hl');
  }
  return destinationUrl;
}

async function fetchPage(request: Request): Promise<Response> {
  const response = await fetch(request);
  const nextHeaders = new Headers(response.headers);
  appendVary(nextHeaders, 'Accept-Language');
  appendVary(nextHeaders, 'Cookie');

  return new Response(response.body, {
    headers: nextHeaders,
    status: response.status,
    statusText: response.statusText
  });
}

async function localePageExistsAt(request: Request, destinationUrl: URL): Promise<boolean> {
  const probeRequest = new Request(destinationUrl.toString(), {
    headers: createForwardHeaders(request),
    method: 'HEAD'
  });

  try {
    const response = await fetch(probeRequest);
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

function createRedirect(destinationUrl: URL, locale: string): Response {
  return new Response(null, {
    headers: {
      Location: destinationUrl.toString(),
      'Set-Cookie': createLanguageCookie(locale),
      Vary: 'Accept-Language, Cookie'
    },
    status: 302
  });
}

export function appendVary(headers: Headers, value: string): void {
  const current = headers.get('Vary') || '';
  const existing = current
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (existing.includes('*') || existing.includes(value.toLowerCase())) return;
  headers.set('Vary', current ? `${current}, ${value}` : value);
}

function createForwardHeaders(request: Request): Headers {
  const headers = new Headers(request.headers);
  headers.set('Accept', 'text/html,*/*;q=0.8');
  headers.delete('Cookie');
  return headers;
}

export function pickAcceptLanguage(header: string | null): string {
  if (!header) return '';

  return header
    .split(',')
    .map(parseLanguagePreference)
    .filter((entry) => entry.locale)
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.locale)
    .find(Boolean) || '';
}

function parseLanguagePreference(part: string): LanguagePreference {
  const [rawLocale, ...params] = part.trim().split(';');
  const qualityParam = params.find((param) => param.trim().startsWith('q='));
  const quality = qualityParam ? Number(qualityParam.trim().slice(2)) : 1;

  return {
    locale: normalizeLocale(rawLocale),
    quality: Number.isFinite(quality) ? quality : 1
  };
}

export function normalizeLocale(value: unknown): string {
  const locale = decodeURIComponent(String(value || '')).trim().toLowerCase().replace('_', '-');
  if (!locale) return '';
  if (
    locale === 'zh' ||
    locale.startsWith('zh-cn') ||
    locale.startsWith('zh-hans') ||
    locale.startsWith('zh-sg')
  ) {
    return 'zh-CN';
  }
  if (
    locale.startsWith('zh-tw') ||
    locale.startsWith('zh-hant') ||
    locale.startsWith('zh-hk') ||
    locale.startsWith('zh-mo')
  ) {
    return 'zh-TW';
  }

  const baseLocale = locale.split('-')[0];
  return SUPPORTED_LOCALES.has(baseLocale) ? baseLocale : '';
}

export function getCookie(request: Request, name: string): string {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return cookie ? cookie.slice(name.length + 1) : '';
}

export function createLanguageCookie(locale: string): string {
  return `${LANGUAGE_COOKIE}=${encodeURIComponent(locale)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax; Secure`;
}

export function isBot(userAgent: string | null): boolean {
  return /(bot|crawler|spider|crawling|facebookexternalhit|slurp|duckduckbot|bingpreview)/i.test(userAgent || '');
}
