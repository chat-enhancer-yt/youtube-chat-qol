/**
 * Translation feature entrypoint.
 *
 * Loading this module registers translation feature hooks. Queue/cache
 * behavior stays in `queue.ts`, while this entrypoint owns the feature wiring
 * so helper imports do not accidentally boot translation.
 */
import type { Options } from '../../shared/options';
import { getOptions } from '../../shared/state';
import { registerFeature, type FeatureMessageContext } from '../../content/dispatcher';
import { clearTranslations, queueMessageTranslation, queueRetroactiveTranslations } from './queue';

registerFeature({
  page: {
    boot: queueRetroactiveTranslations,
    cleanup: clearTranslations,
    optionsChanged: handleTranslationOptionsChanged,
    reset: clearTranslations,
    visibleRecovery: queueRetroactiveTranslations
  },
  message: handleTranslationMessage
});

function handleTranslationOptionsChanged(previousOptions: Options, nextOptions: Options): void {
  const languageChanged = nextOptions.targetLanguage !== previousOptions.targetLanguage;
  const displayChanged = nextOptions.translationDisplay !== previousOptions.translationDisplay;
  if (!languageChanged && !displayChanged) return;

  clearTranslations();
  if (nextOptions.targetLanguage) queueRetroactiveTranslations();
}

function handleTranslationMessage(
  message: HTMLElement,
  { record, source }: FeatureMessageContext
): void {
  if (!getOptions().targetLanguage) return;
  const originalText = getRecordMessageText(record);
  if (source === 'existing' && message.classList.contains('ytcq-lite-message')) {
    // Lite mode replaces the native history with fresh elements. Backfill only
    // those rows so cached native translations carry across immediately while
    // untranslated history continues through the normal bounded queue.
    queueMessageTranslation(
      message,
      originalText ? { backfill: true, originalText } : { backfill: true }
    );
    return;
  }
  if (source !== 'added' && source !== 'changed') return;
  if (source === 'changed' && message.dataset.ytcqTranslationKey) return;

  if (originalText) {
    queueMessageTranslation(message, { originalText });
  } else {
    queueMessageTranslation(message);
  }
}

function getRecordMessageText(record: FeatureMessageContext['record']): string {
  if (!record?.plainText || record.kind === 'sticker') return '';
  if (
    record.kind === 'membership' &&
    (!record.membership || record.plainText === record.membership.headerText)
  ) {
    return '';
  }

  return record.plainText;
}
