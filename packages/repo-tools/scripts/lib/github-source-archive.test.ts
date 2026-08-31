import { describe, expect, it, vi } from 'vitest';
import {
  fetchGitHubSourceArchive,
  getGitHubSourceArchiveUrl
} from './github-source-archive.ts';

const commit = '0123456789abcdef0123456789abcdef01234567';

describe('GitHub source archives', () => {
  it('targets an immutable commit archive', () => {
    expect(getGitHubSourceArchiveUrl('chatenhancer/youtube-chat-qol', commit)).toBe(
      `https://github.com/chatenhancer/youtube-chat-qol/archive/${commit}.zip`
    );
  });

  it('downloads a ZIP archive', async () => {
    const bytes = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
    const fetchImpl = vi.fn(async () => new Response(bytes)) as typeof fetch;

    await expect(fetchGitHubSourceArchive({
      commit,
      repository: 'chatenhancer/youtube-chat-qol',
      fetchImpl
    })).resolves.toEqual(bytes);
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://github.com/chatenhancer/youtube-chat-qol/archive/${commit}.zip`,
      { headers: { Accept: 'application/zip' } }
    );
  });

  it('rejects invalid repository and commit values', () => {
    expect(() => getGitHubSourceArchiveUrl('chatenhancer', commit)).toThrow(/repository/);
    expect(() => getGitHubSourceArchiveUrl('chatenhancer/youtube-chat-qol', 'main')).toThrow(/commit/);
  });

  it('rejects failed or non-ZIP downloads', async () => {
    const failedFetch = vi.fn(async () => new Response('', {
      status: 404,
      statusText: 'Not Found'
    })) as typeof fetch;
    const textFetch = vi.fn(async () => new Response('not a zip')) as typeof fetch;

    await expect(fetchGitHubSourceArchive({
      commit,
      repository: 'chatenhancer/youtube-chat-qol',
      fetchImpl: failedFetch
    })).rejects.toThrow(/404 Not Found/);
    await expect(fetchGitHubSourceArchive({
      commit,
      repository: 'chatenhancer/youtube-chat-qol',
      fetchImpl: textFetch
    })).rejects.toThrow(/ZIP file/);
  });
});
