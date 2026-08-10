import { describe, expect, it } from 'vitest';
import { parseReleaseTagArgs, parseRemoteTagOutput } from './create-release-tag.ts';

describe('release tag command', () => {
  it('creates a new release tag by default', () => {
    expect(parseReleaseTagArgs([])).toEqual({
      dryRun: false,
      help: false,
      remote: 'origin',
      retry: false
    });
  });

  it('parses guarded release retry options', () => {
    expect(parseReleaseTagArgs(['--retry', '--remote', 'upstream', '--dry-run'])).toEqual({
      dryRun: true,
      help: false,
      remote: 'upstream',
      retry: true
    });
  });

  it('rejects missing and unknown option values', () => {
    expect(() => parseReleaseTagArgs(['--remote'])).toThrow('Expected a remote name');
    expect(() => parseReleaseTagArgs(['--replace'])).toThrow('Unknown argument');
  });

  it('reads the commit target of an annotated remote tag', () => {
    const tagRef = 'refs/tags/v1.2.3';
    expect(parseRemoteTagOutput([
      `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\t${tagRef}`,
      `bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\t${tagRef}^{}`
    ].join('\n'), tagRef)).toEqual({
      refOid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      targetOid: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    });
  });

  it('uses a lightweight tag ref as its commit target', () => {
    const tagRef = 'refs/tags/v1.2.3';
    expect(parseRemoteTagOutput(
      `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\t${tagRef}`,
      tagRef
    )).toEqual({
      refOid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      targetOid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    });
  });

  it('reports a missing remote tag', () => {
    expect(parseRemoteTagOutput('', 'refs/tags/v1.2.3')).toBeNull();
  });
});
