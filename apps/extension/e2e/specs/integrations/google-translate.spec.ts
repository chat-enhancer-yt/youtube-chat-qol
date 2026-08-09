/** Google Translate contract kept separate from YouTube DOM compatibility. */
import { realBatchTranslationProviderScenario } from '../../scenarios/translation/provider';
import { extensionScenarioTest as test } from '../../support/scenario-fixtures';

test(
  'Google Translate integration: incoming translation batches reach the real provider',
  realBatchTranslationProviderScenario
);
