import { controls } from './controls';

const SCROLL_FADE_TOP_CLASS = 'popup-scroll-fade-top';
const SCROLL_FADE_BOTTOM_CLASS = 'popup-scroll-fade-bottom';
const SCROLL_EDGE_TOLERANCE_PX = 1;
const NESTED_SCROLL_FADE_REGION_SELECTOR = '[data-popup-scroll-fade-region]';
const NESTED_SCROLL_TARGET_SELECTOR = '[data-popup-scroll-target]';
const POPUP_TAB_HIGHLIGHT_ANIMATED_CLASS = 'popup-tab-highlight-animated';
const POPUP_LAST_TAB_STORAGE_KEY = 'ytcqPopupLastTab';
let popupScrollFadeRegion: HTMLElement | null = null;
let popupScrollFadeRefreshTimer = 0;
let popupTabSelectedByUser = false;
let popupTabList: HTMLElement | null = null;
let previewedPopupTab: HTMLButtonElement | null = null;

export function initPopupTabs(): void {
  initPopupScrollFades();
  initPopupTabHighlight();
  restoreLastPopupTab();

  controls.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.popupTabTarget;
      if (!targetId) return;
      enablePopupTabHighlightAnimation();
      popupTabSelectedByUser = true;
      selectPopupTab(targetId);
      chrome.storage.session?.set({ [POPUP_LAST_TAB_STORAGE_KEY]: targetId });
    });
  });
}

function initPopupTabHighlight(): void {
  const tabList = document.querySelector<HTMLElement>('.popup-tabs');
  if (!tabList) return;
  popupTabList = tabList;

  controls.tabs.forEach((tab) => {
    const previewTab = () => {
      enablePopupTabHighlightAnimation();
      previewedPopupTab = tab;
      syncPopupTabHighlight();
    };
    tab.addEventListener('pointerenter', previewTab);
    tab.addEventListener('focus', previewTab);
  });

  tabList.addEventListener('pointerleave', () => {
    previewedPopupTab = null;
    syncPopupTabHighlight();
  });
  tabList.addEventListener('focusout', (event) => {
    if (event.relatedTarget instanceof Node && tabList.contains(event.relatedTarget)) return;

    previewedPopupTab = null;
    syncPopupTabHighlight();
  });
  window.addEventListener('resize', syncPopupTabHighlight);
  syncPopupTabHighlight();
}

function enablePopupTabHighlightAnimation(): void {
  popupTabList?.classList.add(POPUP_TAB_HIGHLIGHT_ANIMATED_CLASS);
}

function syncPopupTabHighlight(): void {
  const activeTab = controls.tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
  positionPopupTabHighlight(previewedPopupTab || activeTab || null);
}

function positionPopupTabHighlight(tab: HTMLButtonElement | null): void {
  if (!popupTabList || !tab) {
    popupTabList?.style.setProperty('--ytcq-popup-tab-highlight-opacity', '0');
    return;
  }

  popupTabList.style.setProperty('--ytcq-popup-tab-highlight-x', `${tab.offsetLeft}px`);
  popupTabList.style.setProperty('--ytcq-popup-tab-highlight-width', `${tab.offsetWidth}px`);
  popupTabList.style.setProperty('--ytcq-popup-tab-highlight-height', `${tab.offsetHeight}px`);
  popupTabList.style.setProperty('--ytcq-popup-tab-highlight-opacity', '1');
}

function restoreLastPopupTab(): void {
  chrome.storage.session?.get(POPUP_LAST_TAB_STORAGE_KEY, (stored) => {
    if (popupTabSelectedByUser) return;

    const targetId = stored?.[POPUP_LAST_TAB_STORAGE_KEY];
    if (
      typeof targetId === 'string' &&
      controls.tabs.some((tab) => tab.dataset.popupTabTarget === targetId) &&
      controls.tabPanels.some((panel) => panel.id === targetId)
    ) {
      selectPopupTab(targetId);
    }
  });
}

export function initOptionHelperLinks(): void {
  document.querySelectorAll<HTMLAnchorElement>('.option-helper-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  });
}

function initPopupScrollFades(): void {
  popupScrollFadeRegion = document.querySelector<HTMLElement>('.popup-tab-panels');
  if (!popupScrollFadeRegion) return;

  controls.tabPanels.forEach((panel) => {
    panel.addEventListener('scroll', updatePopupScrollFades, { passive: true });
    panel.addEventListener('click', schedulePopupScrollFadeUpdate);
    panel.addEventListener('change', schedulePopupScrollFadeUpdate);
    panel.addEventListener('input', schedulePopupScrollFadeUpdate);
  });
  document
    .querySelectorAll<HTMLElement>(NESTED_SCROLL_TARGET_SELECTOR)
    .forEach((target) =>
      target.addEventListener('scroll', updatePopupScrollFades, { passive: true })
    );
  window.addEventListener('resize', schedulePopupScrollFadeUpdate);

  schedulePopupScrollFadeUpdate();
}

export function refreshPopupScrollFades(): void {
  schedulePopupScrollFadeUpdate();
}

function schedulePopupScrollFadeUpdate(): void {
  updatePopupScrollFades();
  if (popupScrollFadeRefreshTimer) window.clearTimeout(popupScrollFadeRefreshTimer);
  popupScrollFadeRefreshTimer = window.setTimeout(() => {
    popupScrollFadeRefreshTimer = 0;
    updatePopupScrollFades();
  }, 0);
}

function updatePopupScrollFades(): void {
  if (!popupScrollFadeRegion) return;

  const activePanel = controls.tabPanels.find((panel) => !panel.hidden);
  const nestedScrollTarget = activePanel?.querySelector<HTMLElement>(
    NESTED_SCROLL_TARGET_SELECTOR
  );
  const scrollTarget = nestedScrollTarget || activePanel;
  const activeFadeRegion =
    nestedScrollTarget?.closest<HTMLElement>(NESTED_SCROLL_FADE_REGION_SELECTOR) ||
    popupScrollFadeRegion;

  const hasScrollableContent = scrollTarget
    ? scrollTarget.scrollHeight > scrollTarget.clientHeight + SCROLL_EDGE_TOLERANCE_PX
    : false;
  const hasContentAbove = Boolean(
    scrollTarget && scrollTarget.scrollTop > SCROLL_EDGE_TOLERANCE_PX
  );
  const hasContentBelow = Boolean(
    scrollTarget &&
    hasScrollableContent &&
    scrollTarget.scrollTop + scrollTarget.clientHeight <
      scrollTarget.scrollHeight - SCROLL_EDGE_TOLERANCE_PX
  );

  if (activeFadeRegion !== popupScrollFadeRegion) {
    popupScrollFadeRegion.classList.remove(SCROLL_FADE_TOP_CLASS, SCROLL_FADE_BOTTOM_CLASS);
  }

  // Preserve hidden nested regions' classes so Firefox can restore their pseudo-elements.
  activeFadeRegion.classList.toggle(SCROLL_FADE_TOP_CLASS, hasContentAbove);
  activeFadeRegion.classList.toggle(SCROLL_FADE_BOTTOM_CLASS, hasContentBelow);
}

function selectPopupTab(targetId: string): void {
  controls.tabs.forEach((tab) => {
    const active = tab.dataset.popupTabTarget === targetId;
    tab.classList.toggle('popup-tab-active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  controls.tabPanels.forEach((panel) => {
    panel.hidden = panel.id !== targetId;
  });

  syncPopupTabHighlight();
  schedulePopupScrollFadeUpdate();
}
