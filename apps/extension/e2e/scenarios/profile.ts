/**
 * Browser scenario for avatar recent-message cards.
 *
 * Shared scenarios use the first visible live-chat message so the same behavior
 * can be checked against both the deterministic fixture and real YouTube chat.
 * Fixture-only update checks are exported separately.
 */
import { expect, test, type BrowserContext, type Locator } from '@playwright/test';
import { appendMockFixtureMessage, isMockPageSurface } from '../support/mock-page';
import { centerLocatorInViewport } from '../support/locator';
import { cleanVisibleText, getRichVisibleText } from '../support/text';
import { NORMAL_CHAT_MESSAGE_SELECTOR, type BrowserScenario, type ChatSurface } from './types';

const PROFILE_ACCENT_TEST_AVATAR = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect width="64" height="64" fill="#a62fd0"/>
  </svg>
`)}`;

export const profileCardRecentMessagesScenario: BrowserScenario = async ({ chat, context }) => {
  const source = await openStableProfileCardFromRecentMessage(chat);
  await expectProfileCardHasRecentMessages(chat, source);
  await expectProfileAvatarRingToggle(chat, source);
  await expectProfileCardJumpToMessage(chat, source);
  await expectProfileChannelButtonOpensChannel(chat, context);
  await closeProfileCard(chat);
};

export const profileCardReceivesNewMessagesScenario: BrowserScenario = async ({ chat }) => {
  const source = await openStableProfileCardFromRecentMessage(chat);
  await expectProfileCardHasRecentMessages(chat, source);
  await appendAuthorMessageAndVerifyProfileCardUpdates(chat, source);
  await closeProfileCard(chat);
};

export const profileCardHistoryPagingScenario: BrowserScenario = async ({ chat }) => {
  await test.step('Page through retained profile history around an older feed message', async () => {
    if (!isMockPageSurface(chat)) {
      throw new Error('Profile history paging requires the deterministic mock chat page.');
    }

    const author = '@ProfileHistoryViewer';
    const channel = 'profile-history-channel';
    const messageIds: string[] = [];
    for (let index = 0; index < 30; index += 1) {
      const messageId = await appendMockFixtureMessage(chat, {
        author,
        channel,
        text: `Profile history ${index}`
      });
      if (messageId) messageIds.push(messageId);
    }
    expect(messageIds).toHaveLength(30);

    const originMessageId = messageIds[15];
    const originMessage = chat.locator(
      `${NORMAL_CHAT_MESSAGE_SELECTOR}[id="${escapeCssString(originMessageId)}"]`
    );
    await centerLocatorInViewport(originMessage);
    await originMessage.locator('#author-photo').click();

    const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
    const list = profileCard.locator('.ytcq-profile-card-messages');
    const records = list.locator('.ytcq-profile-card-message');
    const originRecord = records.filter({ hasText: 'Profile history 15' });
    await expect(records).toHaveCount(12);
    await expect(originRecord).toHaveClass(/ytcq-profile-card-message-origin/);
    await expect(originRecord).toBeVisible();

    await list.evaluate((element) => {
      element.scrollTop = 0;
      element.dispatchEvent(new Event('scroll'));
    });
    await expect(records).toHaveCount(21);
    await expect(records.first()).toContainText('Profile history 0');
    await list.evaluate(
      () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
    );

    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event('scroll'));
    });
    await expect(records).toHaveCount(30);
    await expect(records.last()).toContainText('Profile history 29');

    await closeProfileCard(chat);
  });
};

export const profileCardAeroOriginHighlightScenario: BrowserScenario = async ({ chat }) => {
  await test.step('Keep the profile origin message highlighted in Aero', async () => {
    if (!isMockPageSurface(chat)) {
      throw new Error('Aero profile origin styling requires the deterministic mock chat page.');
    }

    const root = chat.locator('html');
    const previousSkin = await root.evaluate((element) => ({
      skin: element.getAttribute('data-ytcq-chat-skin'),
      theme: element.getAttribute('data-ytcq-chat-skin-theme')
    }));

    try {
      await root.evaluate((element) => {
        element.setAttribute('data-ytcq-chat-skin', 'aero');
        element.setAttribute('data-ytcq-chat-skin-theme', 'light');
      });

      const source = await openStableProfileCardFromRecentMessage(chat);
      const originRecord = await getProfileCardRecord(chat, source);
      await expect(originRecord).toHaveClass(/ytcq-profile-card-message-origin/);

      for (const theme of ['light', 'dark'] as const) {
        await root.evaluate((element, value) => {
          element.setAttribute('data-ytcq-chat-skin-theme', value);
        }, theme);
        await expect(originRecord, `Expected an Aero ${theme} origin-message highlight.`).toHaveCSS(
          'box-shadow',
          /inset/
        );
      }
    } finally {
      await closeProfileCardIfPresent(chat);
      await root.evaluate((element, attributes) => {
        for (const [name, value] of Object.entries({
          'data-ytcq-chat-skin': attributes.skin,
          'data-ytcq-chat-skin-theme': attributes.theme
        })) {
          if (value === null) element.removeAttribute(name);
          else element.setAttribute(name, value);
        }
      }, previousSkin);
    }
  });
};

export const profileCardAvatarAccentScenario: BrowserScenario = async ({ chat }) => {
  await test.step('Tint the profile card and reflect its avatar color through Aero glass', async () => {
    if (!isMockPageSurface(chat)) {
      throw new Error('Avatar-derived profile accents require the deterministic mock chat page.');
    }

    const root = chat.locator('html');
    const previousTheme = await root.evaluate((element) => ({
      dark: element.hasAttribute('dark'),
      skin: element.getAttribute('data-ytcq-chat-skin'),
      theme: element.getAttribute('data-ytcq-chat-skin-theme')
    }));

    try {
      await root.evaluate((element) => {
        element.removeAttribute('data-ytcq-chat-skin');
        element.removeAttribute('data-ytcq-chat-skin-theme');
      });
      const sourceMessageId = await chat
        .locator(NORMAL_CHAT_MESSAGE_SELECTOR)
        .last()
        .getAttribute('id');
      expect(sourceMessageId).not.toBeNull();
      const source = chat.locator(
        `${NORMAL_CHAT_MESSAGE_SELECTOR}[id="${escapeCssString(sourceMessageId || '')}"]`
      );
      await centerLocatorInViewport(source);
      await source.locator('#author-photo img, #author-photo #img, img#img').first().evaluate(
        (image, src) => {
          (image as HTMLImageElement).src = src;
        },
        PROFILE_ACCENT_TEST_AVATAR
      );
      await source.locator('#author-photo').click();

      const card = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
      await expect(card).toHaveClass(/ytcq-profile-card-has-avatar-accent/);
      await expect(card).toHaveCSS('--ytcq-profile-avatar-accent', /hsl\(/);
      const cornerGeometry = await card.evaluate((element) => {
        const avatar = element.querySelector<HTMLElement>('.ytcq-profile-card-avatar-tint');
        if (!avatar) return null;
        const panelRect = element.getBoundingClientRect();
        const avatarRect = avatar.getBoundingClientRect();
        const panelStyle = getComputedStyle(element);
        const surfaceStyle = getComputedStyle(element, '::before');
        return {
          avatarBleedsPastPanel: {
            bottom: avatarRect.bottom > panelRect.bottom,
            left: avatarRect.left < panelRect.left,
            right: avatarRect.right > panelRect.right,
            top: avatarRect.top < panelRect.top
          },
          panelCornerShape: panelStyle.getPropertyValue('corner-shape'),
          panelRadius: panelStyle.borderRadius,
          surfaceCornerShape: surfaceStyle.getPropertyValue('corner-shape'),
          surfaceRadius: surfaceStyle.borderRadius
        };
      });
      expect(cornerGeometry).not.toBeNull();
      expect(cornerGeometry!.avatarBleedsPastPanel).toEqual({
        bottom: true,
        left: true,
        right: true,
        top: true
      });
      expect(cornerGeometry!.surfaceRadius).toBe(cornerGeometry!.panelRadius);
      expect(cornerGeometry!.surfaceCornerShape).toBe(cornerGeometry!.panelCornerShape);
      await expectProfileAvatarAccentReveal(card);
      const firstAvatarSrc = await card
        .locator('.ytcq-profile-card-avatar-tint')
        .getAttribute('src');

      await closeProfileCard(chat);
      const cachedReopen = await source.locator('#author-photo').evaluate((element) => {
        (element as HTMLElement).click();
        const reopenedCard = element.ownerDocument.querySelector<HTMLElement>(
          '.ytcq-profile-card:not(.ytcq-inbox-card)'
        );
        if (!reopenedCard) return null;

        return {
          hasAccent: reopenedCard.classList.contains(
            'ytcq-profile-card-has-avatar-accent'
          ),
          sourceAvatarSrc:
            element.querySelector<HTMLImageElement>('img#img, img')?.src || '',
          tintAvatarSrc:
            reopenedCard.querySelector<HTMLImageElement>(
              '.ytcq-profile-card-avatar-tint'
            )?.src || '',
          surfaceOpacity: Number(getComputedStyle(reopenedCard, '::before').opacity)
        };
      });
      expect(cachedReopen).toEqual({
        hasAccent: true,
        sourceAvatarSrc: firstAvatarSrc,
        tintAvatarSrc: firstAvatarSrc,
        surfaceOpacity: 1
      });
      await expect(card).toBeVisible();

      await root.evaluate((element) => {
        element.setAttribute('data-ytcq-chat-skin', 'aero');
        element.setAttribute('data-ytcq-chat-skin-theme', 'light');
      });
      await expect(card).toHaveCSS('--ytcq-profile-avatar-accent', /hsl\(/);
      await expect(card.locator('.ytcq-profile-card-author')).toHaveCSS(
        'color',
        'rgb(0, 90, 147)'
      );
      const aeroReflection = await card.evaluate((element) => {
        const cardStyle = getComputedStyle(element);
        const surfaceStyle = getComputedStyle(element, '::before');
        return {
          backgroundImage: surfaceStyle.backgroundImage,
          boxShadow: surfaceStyle.boxShadow,
          reflection: cardStyle
            .getPropertyValue('--ytcq-profile-aero-avatar-reflection')
            .trim()
        };
      });
      expect(aeroReflection.reflection).not.toBe('');
      expect(aeroReflection.backgroundImage).not.toBe('none');
      expect(aeroReflection.boxShadow).not.toBe('none');
      await expectProfileAvatarAccentReveal(card);

      await root.evaluate((element) => {
        element.setAttribute('data-ytcq-chat-skin-theme', 'dark');
      });
      const darkPalette = await card.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          active: style.getPropertyValue('--ytcq-profile-avatar-accent').trim(),
          dark: style.getPropertyValue('--ytcq-profile-avatar-accent-dark').trim()
        };
      });
      expect(darkPalette.active).toBe(darkPalette.dark);
    } finally {
      await closeProfileCardIfPresent(chat);
      await root.evaluate((element, attributes) => {
        element.toggleAttribute('dark', attributes.dark);
        for (const [name, value] of Object.entries({
          'data-ytcq-chat-skin': attributes.skin,
          'data-ytcq-chat-skin-theme': attributes.theme
        })) {
          if (value === null) element.removeAttribute(name);
          else element.setAttribute(name, value);
        }
      }, previousTheme);
    }
  });
};

async function expectProfileAvatarAccentReveal(card: Locator): Promise<void> {
  await card.evaluate((element) => {
    element.classList.remove('ytcq-profile-card-has-avatar-accent');
  });
  await expect
    .poll(() =>
      card.evaluate((element) => Number(getComputedStyle(element, '::before').opacity))
    )
    .toBe(0);
  const reveal = await card.evaluate((element) => {
    element.classList.add('ytcq-profile-card-has-avatar-accent');
    const style = getComputedStyle(element, '::before');
    return {
      transitionDuration: style.transitionDuration,
      transitioningOpacity: Number(style.opacity)
    };
  });
  expect(reveal.transitionDuration).toBe('0.18s');
  expect(reveal.transitioningOpacity).toBeLessThan(1);
  await expect
    .poll(() =>
      card.evaluate((element) => Number(getComputedStyle(element, '::before').opacity))
    )
    .toBe(1);
}

export const profileMentionOpensRecentMessagesScenario: BrowserScenario = async ({ chat }) => {
  await test.step('Open mentioned-user history from an inline handle', async () => {
    if (!isMockPageSurface(chat)) {
      throw new Error('Clickable profile mentions require the deterministic mock chat page.');
    }

    const mentionedAuthor = '@MentionedProfileViewer';
    const mentionText = mentionedAuthor.toLowerCase();
    const mentionedChannel = 'mentioned-profile-channel';
    const nestedAuthor = '@NestedProfileViewer';
    const nestedMentionText = nestedAuthor.toLowerCase();
    const nestedHistoryText = `Nested profile history ${Date.now()}`;
    const historyText = `Please ask ${nestedMentionText} next`;
    await appendMockFixtureMessage(chat, {
      author: nestedAuthor,
      channel: 'nested-profile-channel',
      text: nestedHistoryText
    });
    await appendMockFixtureMessage(chat, {
      author: mentionedAuthor,
      channel: mentionedChannel,
      text: historyText
    });
    const mentionMessageId = await appendMockFixtureMessage(chat, {
      author: '@MentioningProfileViewer',
      channel: 'mentioning-profile-channel',
      text: `Please ask ${mentionText}, not @mentionedprofile or @NoMatchingProfileViewer`
    });
    expect(mentionMessageId).not.toBeNull();

    const mentionMessage = chat.locator(
      `${NORMAL_CHAT_MESSAGE_SELECTOR}[id="${escapeCssString(mentionMessageId || '')}"]`
    );
    const mention = mentionMessage.locator('.ytcq-profile-mention').filter({
      hasText: mentionText
    });
    await expect(mention).toBeVisible();
    await expect(mention).toHaveAttribute('role', 'button');
    await expect(mentionMessage.locator('.ytcq-profile-mention')).toHaveCount(1);
    await mention.click();

    const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
    await expect(profileCard.locator('.ytcq-profile-card-title')).toHaveText(mentionedAuthor);
    await expect(
      profileCard.locator('.ytcq-profile-card-message').filter({ hasText: historyText })
    ).toBeVisible();

    const nestedMention = profileCard.locator('.ytcq-profile-mention').filter({
      hasText: nestedMentionText
    });
    await expect(nestedMention).toBeVisible();
    await chat.evaluate(() => {
      const testWindow = window as typeof window & {
        ytcqBrowserProfileMentionRect?: { left: number; right: number; top: number };
      };
      delete testWindow.ytcqBrowserProfileMentionRect;
      window.addEventListener(
        'click',
        (event) => {
          const target = event.target instanceof Element ? event.target : null;
          const mention = target?.closest<HTMLElement>(
            '.ytcq-profile-card .ytcq-profile-mention'
          );
          if (!mention) return;

          const rect = mention.getBoundingClientRect();
          testWindow.ytcqBrowserProfileMentionRect = {
            left: rect.left,
            right: rect.right,
            top: rect.top
          };
        },
        { capture: true, once: true }
      );
    });
    await nestedMention.click();
    const nestedMentionRect = await chat.evaluate(() => {
      const testWindow = window as typeof window & {
        ytcqBrowserProfileMentionRect?: { left: number; right: number; top: number };
      };
      const rect = testWindow.ytcqBrowserProfileMentionRect || null;
      delete testWindow.ytcqBrowserProfileMentionRect;
      return rect;
    });
    expect(nestedMentionRect).not.toBeNull();

    await expect(profileCard.locator('.ytcq-profile-card-title')).toHaveText(nestedAuthor);
    await expect(
      profileCard.locator('.ytcq-profile-card-message').filter({ hasText: nestedHistoryText })
    ).toBeVisible();
    await expectProfileCardPositionedFromAnchor(profileCard, nestedMentionRect!);
    await closeProfileCard(chat);
  });
};

async function expectProfileCardPositionedFromAnchor(
  profileCard: Locator,
  anchorRect: { left: number; right: number; top: number }
): Promise<void> {
  await expect.poll(
    async () => profileCard.evaluate((element, anchor) => {
      const margin = 8;
      const cardRect = element.getBoundingClientRect();
      let expectedLeft = anchor.right + margin;
      if (expectedLeft + cardRect.width + margin > window.innerWidth) {
        expectedLeft = anchor.left - cardRect.width - margin;
      }

      let expectedTop = anchor.top;
      if (expectedTop + cardRect.height + margin > window.innerHeight) {
        expectedTop = window.innerHeight - cardRect.height - margin;
      }

      return {
        x: Math.round(cardRect.left) - Math.max(margin, Math.round(expectedLeft)),
        y: Math.round(cardRect.top) - Math.max(margin, Math.round(expectedTop))
      };
    }, anchorRect),
    {
      message: 'Nested profile card should settle at the clicked mention’s position.'
    }
  ).toEqual({ x: 0, y: 0 });
}

interface MessageSource {
  authorName: string;
  channelId: string;
  messageId: string;
  messageText: string;
  targetId: string;
}

const PROFILE_TARGET_ATTRIBUTE = 'data-ytcq-browser-profile-target';
let nextProfileTargetId = 0;

async function openStableProfileCardFromRecentMessage(chat: ChatSurface): Promise<MessageSource> {
  return test.step('Open recent-message profile card from a stable avatar', async () => {
    const messages = chat.locator(NORMAL_CHAT_MESSAGE_SELECTOR);
    await messages.last().waitFor({ state: 'visible', timeout: 45_000 });

    const count = await messages.count();
    const firstCandidate = Math.max(0, count - 20);
    for (let index = count - 1; index >= firstCandidate; index -= 1) {
      const targetId = await freezeProfileMessageTarget(messages.nth(index)).catch(() => '');
      if (!targetId) continue;
      const sourceMessage = chat
        .locator(`[${PROFILE_TARGET_ATTRIBUTE}="${escapeCssString(targetId)}"]`)
        .first();
      await centerLocatorInViewport(sourceMessage);

      const sourceBeforeClick = await readProfileMessageSource(sourceMessage, targetId);
      if (!sourceBeforeClick) continue;

      const avatar = sourceMessage.locator('#author-photo').first();
      if (!(await avatar.isVisible({ timeout: 500 }).catch(() => false))) continue;

      await avatar.click({ timeout: 2_000 }).catch(() => undefined);
      const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
      if (!(await profileCard.isVisible({ timeout: 5_000 }).catch(() => false))) continue;

      const sourceAfterClick = await readProfileMessageSource(sourceMessage, targetId);
      const cardAuthor = cleanVisibleText(
        await profileCard
          .locator('.ytcq-profile-card-title')
          .innerText()
          .catch(() => '')
      );
      if (
        sourceAfterClick &&
        cardAuthor === sourceAfterClick.authorName &&
        isSameProfileMessageSource(sourceBeforeClick, sourceAfterClick)
      ) {
        return sourceAfterClick;
      }

      await closeProfileCardIfPresent(chat);
    }

    throw new Error('Could not open a profile card from a stable recent message.');
  });
}

async function readProfileMessageSource(
  message: Locator,
  targetId: string
): Promise<MessageSource | null> {
  const authorName = cleanVisibleText(
    await message
      .locator('#author-name')
      .first()
      .innerText()
      .catch(() => '')
  );
  const messageText = await getRichVisibleText(message.locator('#message').first()).catch(() => '');
  if (!authorName || !messageText || !hasMeaningfulText(messageText)) return null;

  const channelId = await message
    .evaluate((element) => {
      const author = element.querySelector('#author-name');
      const link = author?.closest('a[href]') || element.querySelector('a[href*="/channel/"]');
      const href = link?.getAttribute('href') || '';
      try {
        const url = new URL(href, 'https://www.youtube.com');
        const [kind, id] = url.pathname.split('/').filter(Boolean);
        return kind === 'channel' ? id : '';
      } catch {
        return '';
      }
    })
    .catch(() => '');
  const messageId = (await message.getAttribute('id').catch(() => '')) || '';

  return {
    authorName,
    channelId,
    messageId,
    messageText,
    targetId
  };
}

async function freezeProfileMessageTarget(message: Locator): Promise<string> {
  const targetId = `profile-card-${Date.now()}-${nextProfileTargetId++}`;
  const didFreeze = await message.evaluate(
    (element, { attribute, value }) => {
      if (!(element instanceof HTMLElement) || !element.isConnected) return false;
      element.setAttribute(attribute, value);
      return true;
    },
    {
      attribute: PROFILE_TARGET_ATTRIBUTE,
      value: targetId
    }
  );

  if (!didFreeze)
    throw new Error('Could not stabilize the live chat profile target before clicking it.');
  return targetId;
}

function isSameProfileMessageSource(first: MessageSource, second: MessageSource): boolean {
  const messageIdMatches =
    !first.messageId || !second.messageId || first.messageId === second.messageId;
  return (
    messageIdMatches &&
    first.authorName === second.authorName &&
    first.channelId === second.channelId &&
    first.messageText === second.messageText &&
    first.targetId === second.targetId
  );
}

async function expectProfileCardHasRecentMessages(
  chat: ChatSurface,
  source: MessageSource
): Promise<void> {
  await test.step('Verify profile card shows recent messages for the clicked author', async () => {
    const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
    await expect(profileCard.locator('.ytcq-profile-card-title')).toContainText(source.authorName);
    await expect(await getProfileCardRecord(chat, source)).toBeVisible();
  });
}

async function expectProfileAvatarRingToggle(
  chat: ChatSurface,
  source: MessageSource
): Promise<void> {
  await test.step('Add and remove an avatar ring from the profile header', async () => {
    const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
    const toggle = profileCard.locator('.ytcq-avatar-ring-toggle');
    const sourceAvatar = getSourceMessage(chat, source).locator('#author-photo').first();

    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toHaveAttribute('title', /Forget user\nUser remembered .+/);
    await expect(sourceAvatar).toHaveClass(/ytcq-avatar-ring-active/);

    await profileCard.locator('.ytcq-profile-card-title').hover();
    await expect
      .poll(() => toggle.evaluate((element) => getComputedStyle(element).backgroundColor))
      .toBe('rgba(0, 0, 0, 0)');
    await toggle.hover();
    await expect
      .poll(() => toggle.evaluate((element) => getComputedStyle(element).backgroundColor))
      .not.toBe('rgba(0, 0, 0, 0)');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(sourceAvatar).not.toHaveClass(/ytcq-avatar-ring-active/);
  });
}

async function appendAuthorMessageAndVerifyProfileCardUpdates(
  chat: ChatSurface,
  source: MessageSource
): Promise<void> {
  await test.step('Append a new author message and verify the card updates', async () => {
    const text = `Profile follow-up ${Date.now()}`;
    await appendMockFixtureMessage(chat, {
      author: source.authorName,
      channel: source.channelId || undefined,
      text
    });

    await expect(
      chat
        .locator('.ytcq-profile-card:not(.ytcq-inbox-card) .ytcq-profile-card-message')
        .filter({
          hasText: text
        })
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });
}

async function expectProfileChannelButtonOpensChannel(
  chat: ChatSurface,
  context: BrowserContext
): Promise<void> {
  const youtubeProfileUrlPattern = '**://www.youtube.com/**';
  await test.step('Click profile channel button and verify it opens YouTube', async () => {
    if (isMockPageSurface(chat)) {
      await context.route(youtubeProfileUrlPattern, (route) =>
        route.fulfill({
          body: '<!doctype html><title>Mock channel</title>',
          contentType: 'text/html',
          status: 200
        })
      );
    }

    try {
      const popupPromise = context.waitForEvent('page');
      await chat.locator('.ytcq-profile-card-channel').click();
      const popup = await popupPromise;

      try {
        await expect
          .poll(async () => getOpenedProfileUrl(popup.url()), {
            message: 'Profile channel button should open the selected author channel.',
            timeout: isMockPageSurface(chat) ? 5_000 : 15_000
          })
          .toMatch(/^https:\/\/www\.youtube\.com\/(?:@|channel\/)/);
      } finally {
        await popup.close().catch(() => undefined);
      }
    } finally {
      if (isMockPageSurface(chat)) {
        await context.unroute(youtubeProfileUrlPattern);
      }
    }
  });
}

async function expectProfileCardJumpToMessage(
  chat: ChatSurface,
  source: MessageSource
): Promise<void> {
  await test.step('Jump from profile card record back to the live message', async () => {
    const sourceMessage = getSourceMessage(chat, source);
    const record = await getProfileCardRecord(chat, source);

    await centerLocatorInViewport(record);
    const jumpButton = record.locator('.ytcq-profile-card-jump');
    await jumpButton.focus();
    await expect(jumpButton).toHaveCSS('opacity', '1');
    await jumpButton.press('Enter');
    await expect(sourceMessage).toHaveClass(/ytcq-message-jump-target/, { timeout: 2_000 });
  });
}

async function getProfileCardRecord(chat: ChatSurface, source: MessageSource): Promise<Locator> {
  if (source.messageId) {
    const liveMessageRecord = chat
      .locator(
        `.ytcq-profile-card:not(.ytcq-inbox-card) .ytcq-profile-card-message[data-ytcq-live-message-id="${escapeCssString(source.messageId)}"]`
      )
      .first();
    if (await liveMessageRecord.count()) return liveMessageRecord;
  }

  const records = chat.locator(
    '.ytcq-profile-card:not(.ytcq-inbox-card) .ytcq-profile-card-message'
  );

  await expect
    .poll(async () => findProfileCardRecordIndex(records, source.messageText), {
      message: 'Profile card should contain the exact recent message record.',
      timeout: 10_000
    })
    .toBeGreaterThanOrEqual(0);

  const index = await findProfileCardRecordIndex(records, source.messageText);
  return records.nth(index);
}

async function findProfileCardRecordIndex(records: Locator, expectedText: string): Promise<number> {
  const count = await records.count();

  for (let index = 0; index < count; index += 1) {
    const text = await getRichVisibleText(
      records.nth(index).locator('.ytcq-profile-card-message-text').first(),
      {
        ignoredSelector: '.ytcq-translation, .ytcq-replaced-translation-icon'
      }
    ).catch(() => '');
    if (text === expectedText) return index;
  }

  return -1;
}

async function closeProfileCard(chat: ChatSurface): Promise<void> {
  await test.step('Close profile card', async () => {
    const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
    await profileCard.locator('.ytcq-profile-card-close').click();
    await expect(profileCard).toHaveCount(0);
  });
}

async function closeProfileCardIfPresent(chat: ChatSurface): Promise<void> {
  const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
  if (!(await profileCard.isVisible({ timeout: 500 }).catch(() => false))) return;

  await profileCard
    .locator('.ytcq-profile-card-close')
    .click()
    .catch(() => undefined);
  await expect(profileCard)
    .toHaveCount(0, { timeout: 2_000 })
    .catch(() => undefined);
}

function getSourceMessage(
  chat: ChatSurface,
  source: MessageSource
): ReturnType<ChatSurface['locator']> {
  if (source.targetId) {
    return chat
      .locator(`[${PROFILE_TARGET_ATTRIBUTE}="${escapeCssString(source.targetId)}"]`)
      .first();
  }

  if (source.messageId) {
    return chat
      .locator(`${NORMAL_CHAT_MESSAGE_SELECTOR}[id="${escapeCssString(source.messageId)}"]`)
      .first();
  }

  return chat
    .locator(NORMAL_CHAT_MESSAGE_SELECTOR)
    .filter({
      has: chat.locator('#author-name').filter({ hasText: source.authorName })
    })
    .filter({
      has: chat.locator('#message').filter({ hasText: source.messageText })
    })
    .last();
}

function hasMeaningfulText(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

function escapeCssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function getOpenedProfileUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.hostname === 'consent.youtube.com') {
      const continueUrl = url.searchParams.get('continue');
      if (continueUrl) return continueUrl;
    }
  } catch {
    return value;
  }

  return value;
}
