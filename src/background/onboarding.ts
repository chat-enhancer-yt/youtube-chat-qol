/**
 * Open onboarding once for a new installation without interrupting updates.
 */
export function handleExtensionInstalled(details: chrome.runtime.InstalledDetails): void {
  if (details.reason !== 'install') return;
  void chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
}

chrome.runtime.onInstalled.addListener(handleExtensionInstalled);
