/** External translation-provider contract exercised through the built extension. */
import { expect, test, type BrowserContext, type Route } from '@playwright/test';
import { getExtensionId } from '../../support/extension';
import type { ExtensionScenario } from '../types';

const SOURCE_TEXTS = ['good morning', 'thank you'];
const TARGET_LANGUAGE = 'ja';
const TRANSLATION_PATTERN = /[\u3040-\u30ff\u4e00-\u9faf]/u;
const TRANSLATE_ENDPOINT_PATTERN = 'https://translate.googleapis.com/translate_a/*';

interface BatchTranslationResponse {
  error?: string;
  ok: boolean;
  results?: Array<{
    sourceLanguage: string;
    translatedText: string;
  }>;
}

export const realBatchTranslationProviderScenario: ExtensionScenario = async ({ context }) => {
  await test.step('Translate a fixed batch through real Google Translate', async () => {
    const requestedPaths: string[] = [];
    const captureRequest = async (route: Route) => {
      requestedPaths.push(new URL(route.request().url()).pathname);
      await route.continue();
    };
    await context.route(TRANSLATE_ENDPOINT_PATTERN, captureRequest);
    let response: BatchTranslationResponse;
    try {
      response = await requestRealBatchTranslation(context);
    } finally {
      await context.unroute(TRANSLATE_ENDPOINT_PATTERN, captureRequest);
    }

    expect(response.ok, response.error || 'Real batch translation should succeed.').toBe(true);
    expect(response.results).toHaveLength(SOURCE_TEXTS.length);
    for (const result of response.results || []) {
      expect(result.translatedText).toMatch(TRANSLATION_PATTERN);
    }
    expect(requestedPaths).toContain('/translate_a/t');
    expect(requestedPaths).not.toContain('/translate_a/single');
  });
};

async function requestRealBatchTranslation(
  context: BrowserContext
): Promise<BatchTranslationResponse> {
  const extensionId = await getExtensionId(context);
  const popup = await context.newPage();

  try {
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    return await popup.evaluate(
      (request) =>
        new Promise<BatchTranslationResponse>((resolve) => {
          chrome.runtime.sendMessage(request, (response: BatchTranslationResponse | undefined) => {
            const error = chrome.runtime.lastError;
            if (error) {
              resolve({ ok: false, error: error.message });
              return;
            }
            resolve(
              response || { ok: false, error: 'The translation worker returned no response.' }
            );
          });
        }),
      {
        type: 'ytcq:translateBatch',
        texts: SOURCE_TEXTS,
        targetLanguage: TARGET_LANGUAGE
      }
    );
  } finally {
    await popup.close().catch(() => undefined);
  }
}
