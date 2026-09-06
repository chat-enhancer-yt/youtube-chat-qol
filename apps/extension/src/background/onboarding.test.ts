// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleExtensionInstalled } from './onboarding';

describe('onboarding install behavior', () => {
  beforeEach(() => {
    vi.mocked(chrome.tabs.create).mockClear();
    vi.mocked(chrome.runtime.getURL).mockClear();
  });

  it('opens onboarding for a new installation', () => {
    handleExtensionInstalled({
      id: 'test-extension',
      previousVersion: undefined,
      reason: 'install'
    });

    expect(chrome.runtime.getURL).toHaveBeenCalledWith('onboarding.html');
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://test/onboarding.html'
    });
  });

  it('does not interrupt extension updates', () => {
    handleExtensionInstalled({
      id: 'test-extension',
      previousVersion: '1.0.0',
      reason: 'update'
    });

    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });
});
