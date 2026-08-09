/** Native signed-in YouTube checks whose outbound transport is locally fulfilled. */
import { inboxNativeDirectMentionScenario } from '../../../../../scenarios/inbox';
import {
  interceptedFocusSendRestoresMentionScenario,
  interceptedNativeSendScenario,
  interceptedSendClearsStoredDraftScenario,
  interceptedTranslatedNativeSendScenario
} from '../../../../../scenarios/safe-send';
import { nativeTransportLiveLoggedInTest as test } from '../../../../../support/scenario-fixtures';

test(
  'native transport: composer send is intercepted and handled without posting',
  interceptedNativeSendScenario
);
test(
  'native transport: translated composer text sends only to the local interceptor',
  interceptedTranslatedNativeSendScenario
);
test(
  'native transport: intercepted send clears the saved draft',
  interceptedSendClearsStoredDraftScenario
);
test(
  'native transport: Focus restores its mention after an intercepted send',
  interceptedFocusSendRestoresMentionScenario
);
test(
  'native transport: signed-in direct mentions reach Inbox through continuation data',
  inboxNativeDirectMentionScenario
);
