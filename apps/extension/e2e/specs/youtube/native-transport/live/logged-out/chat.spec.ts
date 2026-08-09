/** Native YouTube renderer coverage with locally controlled continuation data. */
import { expect } from '@playwright/test';
import { focusPanelReceivesNewMessagesScenario } from '../../../../../scenarios/focus';
import {
  inboxNativeKeywordOverlapPreservesProfileMentionScenario,
  inboxNativeRecordCreationAndJumpScenario
} from '../../../../../scenarios/inbox';
import {
  profileCardHistoryPagingScenario,
  profileCardReceivesNewMessagesScenario
} from '../../../../../scenarios/profile/card';
import { replacedTranslationToggleSurfacesScenario } from '../../../../../scenarios/translation/display';
import { nativeTransportLiveLoggedOutTest as test } from '../../../../../support/scenario-fixtures';

test('native transport: YouTube renders an intercepted continuation message', async ({
  chat,
  transport
}) => {
  const messageId = await transport.injectMessage({
    author: '@NativeRendererViewer',
    channel: 'UCNativeRendererViewer',
    text: 'Native continuation renderer check'
  });
  const renderer = chat.locator(`#${messageId}`);

  await expect(renderer).toBeVisible({ timeout: 15_000 });
  await expect(renderer.locator('#author-name')).toContainText('@NativeRendererViewer');
  await expect(renderer.locator('#message')).toContainText('Native continuation renderer check');
  await expect(renderer).not.toHaveAttribute('data-ytcq-fixture-message', 'true');
});

test(
  'native transport: focus receives a controlled continuation message',
  focusPanelReceivesNewMessagesScenario
);
test(
  'native transport: Inbox records, highlights, and jumps to a controlled message',
  inboxNativeRecordCreationAndJumpScenario
);
test(
  'native transport: keyword highlights preserve profile mentions',
  inboxNativeKeywordOverlapPreservesProfileMentionScenario
);
test(
  'native transport: an open profile receives controlled messages',
  profileCardReceivesNewMessagesScenario
);
test(
  'native transport: profile history pages through controlled messages',
  profileCardHistoryPagingScenario
);
test(
  'native transport: replaced translations toggle across chat surfaces',
  replacedTranslationToggleSurfacesScenario
);
