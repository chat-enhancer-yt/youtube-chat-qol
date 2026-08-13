import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AVATAR_RINGS_STORAGE_KEY } from '../shared/avatar-rings';
import { BOOKMARKS_STORAGE_KEY } from '../shared/bookmarks';

describe('popup bookmark filter', () => {
  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = `
      <div id="bookmarksPanel" data-popup-tab-panel>
        <div id="bookmarksBrowseControls">
          <input id="bookmarksFilter" type="search">
          <button id="bookmarksSelect" type="button">Select</button>
        </div>
        <div id="bookmarksSelectionControls" hidden>
          <button id="bookmarksCancelSelection" type="button">Cancel</button>
          <span id="bookmarksSelectionCount"></span>
          <button id="bookmarksSelectAll" type="button">Select all</button>
          <button id="bookmarksRemoveSelected" type="button">Remove</button>
        </div>
        <span id="bookmarksCount"></span>
        <div class="bookmarks-list-shell">
          <div id="bookmarksUndo" hidden>
            <span id="bookmarksUndoCount"></span>
            <button id="bookmarksUndoButton" type="button">Undo</button>
          </div>
          <div id="bookmarksList"></div>
        </div>
      </div>
    `;
    await chrome.storage.local.clear();
    vi.mocked(chrome.storage.onChanged.addListener).mockClear();
    vi.mocked(chrome.tabs.create).mockClear();
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
    expect(document.querySelector('.bookmark-row-added')).toBeNull();

    const filter = document.querySelector<HTMLInputElement>('#bookmarksFilter')!;
    const bookmarkRow = document.querySelector<HTMLElement>('.bookmark-row:not(.avatar-ring-row)')!;
    const rememberedUserRow = document.querySelector<HTMLElement>('.avatar-ring-row')!;
    expect(
      bookmarkRow.querySelector('.bookmark-name')?.classList.contains('bookmark-name-remembered')
    ).toBe(false);
    expect(
      rememberedUserRow
        .querySelector('.bookmark-name')
        ?.classList.contains('bookmark-name-remembered')
    ).toBe(true);

    filter.value = 'LAUNCH WINDOW OPENS';
    filter.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(rememberedUserRow.hidden).toBe(true));
    expect(bookmarkRow.hidden).toBe(false);
    expect(rememberedUserRow.hidden).toBe(true);
    expect(document.querySelector('#bookmarksCount')?.textContent).toBe('1');
    expect(document.querySelector('#bookmarksCount')?.getAttribute('aria-label')).toBe(
      'savedItemsCount:1'
    );
    expect(
      Array.from(bookmarkRow.querySelectorAll('.bookmark-search-highlight')).map(
        (highlight) => highlight.textContent
      )
    ).toEqual(['Launch window opens']);

    filter.value = 'LAUNCH  WINDOW OPENS';
    filter.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(bookmarkRow.hidden).toBe(true));
    expect(rememberedUserRow.hidden).toBe(true);
    expect(document.querySelector('#bookmarksCount')?.textContent).toBe('0');
    expect(document.querySelector('.bookmark-search-highlight')).toBeNull();
    expect(document.querySelector<HTMLElement>('.bookmarks-filter-empty')?.hidden).toBe(false);

    filter.value = 'garden stream';
    filter.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(rememberedUserRow.hidden).toBe(false));
    expect(bookmarkRow.hidden).toBe(true);
    expect(rememberedUserRow.hidden).toBe(false);
    expect(document.querySelector('#bookmarksCount')?.textContent).toBe('1');
    expect(bookmarkRow.querySelector('.bookmark-search-highlight')).toBeNull();
    expect(
      Array.from(rememberedUserRow.querySelectorAll('.bookmark-search-highlight')).map(
        (highlight) => highlight.textContent
      )
    ).toEqual(['Garden stream']);

    filter.value = 'beta garden';
    filter.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(rememberedUserRow.hidden).toBe(true));
    expect(bookmarkRow.hidden).toBe(true);
    expect(rememberedUserRow.hidden).toBe(true);
    expect(document.querySelector('.bookmark-search-highlight')).toBeNull();
    expect(document.querySelector<HTMLElement>('.bookmarks-filter-empty')?.hidden).toBe(false);
    expect(document.querySelector('.bookmarks-filter-empty')?.textContent).toBe(
      'noMatchingSavedItems'
    );
    expect(document.querySelector('#bookmarksCount')?.textContent).toBe('0');

    filter.value = '';
    filter.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(bookmarkRow.hidden).toBe(false));
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
    expect(
      getBookmarkRow('@BetaViewer')
        ?.querySelector('.bookmark-name')
        ?.classList.contains('bookmark-name-remembered')
    ).toBe(true);

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

  it('removes a filtered selection and restores the whole batch with undo', async () => {
    await chrome.storage.local.set({
      [BOOKMARKS_STORAGE_KEY]: {
        'message:space-stream:message-1': {
          authorName: '@AlphaViewer',
          channelId: 'alpha-channel',
          message: {
            messageId: 'message-1',
            text: 'Launch window opens soon',
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
    filter.value = 'garden';
    filter.dispatchEvent(new Event('input'));
    await vi.waitFor(() => {
      expect(document.querySelector<HTMLElement>('.avatar-ring-row')?.hidden).toBe(false);
      expect(
        document.querySelector<HTMLElement>('.bookmark-row:not(.avatar-ring-row)')?.hidden
      ).toBe(true);
    });

    document.querySelector<HTMLButtonElement>('#bookmarksSelect')?.click();
    expect(document.querySelector<HTMLElement>('#bookmarksBrowseControls')?.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>('#bookmarksSelectionControls')?.hidden).toBe(false);
    expect(document.querySelectorAll('.bookmark-selection-checkbox')).toHaveLength(2);

    document.querySelector<HTMLButtonElement>('#bookmarksSelectAll')?.click();
    expect(document.querySelector('#bookmarksSelectionCount')?.textContent).toBe(
      'selectedSavedItemsCount:1'
    );
    expect(
      document.querySelector<HTMLInputElement>('.avatar-ring-row .bookmark-selection-checkbox')
        ?.checked
    ).toBe(true);
    expect(
      document.querySelector<HTMLInputElement>(
        '.bookmark-row:not(.avatar-ring-row) .bookmark-selection-checkbox'
      )?.checked
    ).toBe(false);

    document.querySelector<HTMLButtonElement>('#bookmarksRemoveSelected')?.click();
    await vi.waitFor(async () => {
      await expect(chrome.storage.local.get(AVATAR_RINGS_STORAGE_KEY)).resolves.toEqual({
        [AVATAR_RINGS_STORAGE_KEY]: {}
      });
    });
    await expect(chrome.storage.local.get(BOOKMARKS_STORAGE_KEY)).resolves.toEqual({
      [BOOKMARKS_STORAGE_KEY]: expect.objectContaining({
        'message:space-stream:message-1': expect.any(Object)
      })
    });
    expect(document.querySelector<HTMLElement>('#bookmarksUndo')?.hidden).toBe(false);
    expect(document.querySelector('#bookmarksUndoCount')?.textContent).toBe(
      'removedSavedItemsCount:1'
    );
    expect(document.querySelector('.avatar-ring-row')).toBeNull();
    expect(document.querySelector('.bookmark-row-removed')).toBeNull();

    document.querySelector<HTMLButtonElement>('#bookmarksUndoButton')?.click();
    await vi.waitFor(async () => {
      await expect(chrome.storage.local.get(AVATAR_RINGS_STORAGE_KEY)).resolves.toEqual({
        [AVATAR_RINGS_STORAGE_KEY]: expect.objectContaining({
          'channel:beta-channel': expect.any(Object)
        })
      });
    });
    expect(document.querySelector<HTMLElement>('#bookmarksUndo')?.hidden).toBe(true);
    expect(document.querySelector('#bookmarksCount')?.textContent).toBe('1');
    const restoredRow = document.querySelector<HTMLElement>('.avatar-ring-row');
    expect(restoredRow).not.toBeNull();
    expect(restoredRow?.classList.contains('bookmark-row-added')).toBe(true);

    const animationEnd = new Event('animationend', { bubbles: true });
    Object.defineProperty(animationEnd, 'animationName', {
      value: 'ytcq-popup-bookmark-row-added'
    });
    restoredRow?.dispatchEvent(animationEnd);
    expect(restoredRow?.classList.contains('bookmark-row-added')).toBe(false);
  });

  it('removes mixed saved items together and cancels selection with Escape', async () => {
    await chrome.storage.local.set({
      [BOOKMARKS_STORAGE_KEY]: {
        'message:alpha-stream:message-1': {
          authorName: '@AlphaViewer',
          message: {
            messageId: 'message-1',
            text: 'Saved message',
            timestamp: 1_700_000_000_000,
            timestampText: '10:00 PM'
          },
          savedAt: 1_700_000_001_000,
          sourceKey: 'alpha-stream',
          sourceTitle: 'Alpha stream',
          sourceUrl: 'https://www.youtube.com/watch?v=alpha-stream'
        }
      },
      [AVATAR_RINGS_STORAGE_KEY]: {
        'channel:beta-channel': {
          addedAt: 1_700_000_002_000,
          authorName: '@BetaViewer',
          channelId: 'beta-channel',
          sourceTitle: 'Beta stream',
          sourceUrl: 'https://www.youtube.com/watch?v=beta-stream'
        }
      }
    });

    const { initBookmarksPanel } = await import('./bookmarks');
    initBookmarksPanel();

    document.querySelector<HTMLButtonElement>('#bookmarksSelect')?.click();
    document
      .querySelector<HTMLElement>('.bookmark-row:not(.avatar-ring-row) .bookmark-source-button')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(document.querySelector('#bookmarksSelectionCount')?.textContent).toBe(
      'selectedSavedItemsCount:1'
    );
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    document
      .querySelector<HTMLInputElement>('.bookmark-row-selected .bookmark-selection-checkbox')
      ?.click();
    expect(document.querySelector('#bookmarksSelectionCount')?.textContent).toBe(
      'selectedSavedItemsCount:0'
    );
    document.querySelector<HTMLButtonElement>('#bookmarksSelectAll')?.click();
    expect(document.querySelector('#bookmarksSelectionCount')?.textContent).toBe(
      'selectedSavedItemsCount:2'
    );
    document
      .querySelector('#bookmarksPanel')
      ?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    expect(document.querySelector<HTMLElement>('#bookmarksSelectionControls')?.hidden).toBe(true);
    expect(document.querySelectorAll('.bookmark-selection-checkbox')).toHaveLength(0);

    document.querySelector<HTMLButtonElement>('#bookmarksSelect')?.click();
    document.querySelector<HTMLButtonElement>('#bookmarksSelectAll')?.click();
    document.querySelector<HTMLButtonElement>('#bookmarksRemoveSelected')?.click();

    await vi.waitFor(async () => {
      await expect(chrome.storage.local.get(BOOKMARKS_STORAGE_KEY)).resolves.toEqual({
        [BOOKMARKS_STORAGE_KEY]: {}
      });
      await expect(chrome.storage.local.get(AVATAR_RINGS_STORAGE_KEY)).resolves.toEqual({
        [AVATAR_RINGS_STORAGE_KEY]: {}
      });
    });
    expect(document.querySelector('#bookmarksCount')?.textContent).toBe('0');
    expect(document.querySelector('#bookmarksUndoCount')?.textContent).toBe(
      'removedSavedItemsCount:2'
    );
    expect(document.querySelectorAll('.bookmark-row')).toHaveLength(0);
  });
});
