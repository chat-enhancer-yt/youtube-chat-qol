import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AVATAR_RINGS_STORAGE_KEY } from '../shared/avatar-rings';
import { BOOKMARKS_STORAGE_KEY } from '../shared/bookmarks';

describe('popup bookmark filter', () => {
  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = `
      <input id="bookmarksFilter" type="search">
      <span id="bookmarksCount"></span>
      <div id="bookmarksList"></div>
    `;
    await chrome.storage.local.clear();
    vi.mocked(chrome.storage.onChanged.addListener).mockClear();
  });

  it('shows a numeric total even when no items are saved', async () => {
    const { initBookmarksPanel } = await import('./bookmarks');
    initBookmarksPanel();

    expect(document.querySelector('#bookmarksCount')?.textContent).toBe('0');
    expect(document.querySelector('#bookmarksCount')?.getAttribute('aria-label')).toBe(
      'savedItemsCount:0'
    );
  });

  it('filters saved messages and remembered users as the query changes', async () => {
    await chrome.storage.local.set({
      [BOOKMARKS_STORAGE_KEY]: {
        'message:space-stream:message-1': {
          authorName: '@AlphaViewer',
          channelId: 'alpha-channel',
          message: {
            contentParts: [
              {
                alt: ':rocket:',
                className: 'emoji',
                emojiId: 'rocket',
                src: 'https://example.com/rocket.png',
                tooltip: 'Rocket',
                type: 'emoji'
              },
              { text: ' Launch window opens soon', type: 'text' }
            ],
            messageId: 'message-1',
            text: ':rocket: Launch window opens soon',
            timestamp: 1_700_000_000_000,
            timestampText: '10:00 PM'
          },
          savedAt: 1_700_000_001_000,
          sourceKey: 'space-stream',
          sourceTitle: 'Space stream',
          sourceUrl: 'https://www.youtube.com/watch?v=space-stream'
        }
      },
      [AVATAR_RINGS_STORAGE_KEY]: {
        'channel:beta-channel': {
          addedAt: 1_700_000_002_000,
          authorName: '@BetaViewer',
          channelId: 'beta-channel',
          sourceTitle: 'Garden stream',
          sourceUrl: 'https://www.youtube.com/watch?v=garden-stream'
        }
      }
    });

    const { initBookmarksPanel } = await import('./bookmarks');
    initBookmarksPanel();

    const filter = document.querySelector<HTMLInputElement>('#bookmarksFilter')!;
    const bookmarkRow = document.querySelector<HTMLElement>('.bookmark-row:not(.avatar-ring-row)')!;
    const rememberedUserRow = document.querySelector<HTMLElement>('.avatar-ring-row')!;

    filter.value = 'alpha launch space';
    filter.dispatchEvent(new Event('input'));
    expect(bookmarkRow.hidden).toBe(false);
    expect(rememberedUserRow.hidden).toBe(true);
    expect(document.querySelector('#bookmarksCount')?.textContent).toBe('2');
    expect(
      Array.from(bookmarkRow.querySelectorAll('.bookmark-search-highlight')).map(
        (highlight) => highlight.textContent
      )
    ).toEqual(['Alpha', 'Launch', 'Space']);

    filter.value = 'beta garden';
    filter.dispatchEvent(new Event('input'));
    expect(bookmarkRow.hidden).toBe(true);
    expect(rememberedUserRow.hidden).toBe(false);
    expect(bookmarkRow.querySelector('.bookmark-search-highlight')).toBeNull();
    expect(
      Array.from(rememberedUserRow.querySelectorAll('.bookmark-search-highlight')).map(
        (highlight) => highlight.textContent
      )
    ).toEqual(['Beta', 'Garden']);

    filter.value = 'missing';
    filter.dispatchEvent(new Event('input'));
    expect(bookmarkRow.hidden).toBe(true);
    expect(rememberedUserRow.hidden).toBe(true);
    expect(document.querySelector('.bookmark-search-highlight')).toBeNull();
    expect(document.querySelector<HTMLElement>('.bookmarks-filter-empty')?.hidden).toBe(false);
    expect(document.querySelector('.bookmarks-filter-empty')?.textContent).toBe(
      'noMatchingSavedItems'
    );
    expect(document.querySelector('#bookmarksCount')?.textContent).toBe('2');

    filter.value = '';
    filter.dispatchEvent(new Event('input'));
    expect(bookmarkRow.hidden).toBe(false);
    expect(rememberedUserRow.hidden).toBe(false);
    expect(document.querySelector('.bookmark-search-highlight')).toBeNull();
    expect(bookmarkRow.querySelector('.bookmark-message')?.textContent).toBe(
      ' Launch window opens soon'
    );
    expect(bookmarkRow.querySelector('.bookmark-message img')?.getAttribute('alt')).toBe(
      ':rocket:'
    );
    expect(document.querySelector<HTMLElement>('.bookmarks-filter-empty')?.hidden).toBe(true);
    expect(document.querySelector('#bookmarksCount')?.textContent).toBe('2');
  });

  it('does not replay ring entrance animations for unchanged remembered users', async () => {
    await chrome.storage.local.set({
      [AVATAR_RINGS_STORAGE_KEY]: {
        'channel:alpha-channel': {
          addedAt: 1_700_000_002_000,
          authorName: '@AlphaViewer',
          channelId: 'alpha-channel',
          sourceTitle: 'Alpha stream',
          sourceUrl: 'https://www.youtube.com/watch?v=alpha-stream'
        },
        'channel:beta-channel': {
          addedAt: 1_700_000_001_000,
          authorName: '@BetaViewer',
          channelId: 'beta-channel',
          sourceTitle: 'Beta stream',
          sourceUrl: 'https://www.youtube.com/watch?v=beta-stream'
        }
      },
      [BOOKMARKS_STORAGE_KEY]: {
        'message:beta-stream:message-1': {
          authorName: '@BetaViewer',
          channelId: 'beta-channel',
          message: {
            contentParts: [{ text: 'Remembered viewer message', type: 'text' }],
            messageId: 'message-1',
            text: 'Remembered viewer message',
            timestamp: 1_700_000_000_000,
            timestampText: '10:00 PM'
          },
          savedAt: 1_700_000_000_000,
          sourceKey: 'beta-stream',
          sourceTitle: 'Beta stream',
          sourceUrl: 'https://www.youtube.com/watch?v=beta-stream'
        }
      }
    });

    const { initBookmarksPanel } = await import('./bookmarks');
    initBookmarksPanel();

    const getRememberedUserRow = (authorName: string): HTMLElement | undefined =>
      Array.from(document.querySelectorAll<HTMLElement>('.avatar-ring-row')).find(
        (row) => row.querySelector('.bookmark-name')?.textContent === authorName
      );
    const getBookmarkRow = (authorName: string): HTMLElement | undefined =>
      Array.from(
        document.querySelectorAll<HTMLElement>('.bookmark-row:not(.avatar-ring-row)')
      ).find((row) => row.querySelector('.bookmark-name')?.textContent === authorName);

    expect(
      getRememberedUserRow('@AlphaViewer')?.querySelector('.avatar-ring-avatar-in')
    ).not.toBeNull();
    expect(
      getRememberedUserRow('@BetaViewer')?.querySelector('.avatar-ring-avatar-in')
    ).not.toBeNull();
    expect(getBookmarkRow('@BetaViewer')?.querySelector('.avatar-ring-avatar-in')).not.toBeNull();

    getRememberedUserRow('@AlphaViewer')
      ?.querySelector<HTMLButtonElement>('.avatar-ring-action-button')
      ?.click();

    await vi.waitFor(() => {
      expect(
        getRememberedUserRow('@AlphaViewer')?.classList.contains('avatar-ring-row-removed')
      ).toBe(true);
    });

    const unchangedRememberedUserAvatar =
      getRememberedUserRow('@BetaViewer')?.querySelector('.avatar-ring-avatar');
    expect(unchangedRememberedUserAvatar).not.toBeNull();
    expect(unchangedRememberedUserAvatar?.classList.contains('avatar-ring-avatar-in')).toBe(false);

    const unchangedBookmarkAvatar =
      getBookmarkRow('@BetaViewer')?.querySelector('.avatar-ring-avatar');
    expect(unchangedBookmarkAvatar).not.toBeNull();
    expect(unchangedBookmarkAvatar?.classList.contains('avatar-ring-avatar-in')).toBe(false);
  });
});
