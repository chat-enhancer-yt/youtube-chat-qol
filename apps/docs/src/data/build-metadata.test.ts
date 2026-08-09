import { describe, expect, it } from 'vitest';
import { createGeneratedDocsComment } from './build-metadata';

describe('docs build metadata', () => {
  const generatedAt = new Date('2026-08-09T03:41:08.216Z');

  it('stamps generated HTML with the build time', () => {
    expect(createGeneratedDocsComment({ generatedAt })).toBe(
      '<!-- ytcq-docs-generated: 2026-08-09T03:41:08.216Z -->'
    );
  });

  it('includes the source revision when CI provides one', () => {
    expect(createGeneratedDocsComment({ generatedAt, source: ' 0123456789abcdef ' })).toBe(
      '<!-- ytcq-docs-generated: 2026-08-09T03:41:08.216Z; source=0123456789abcdef -->'
    );
  });

  it('rejects invalid source revisions before rendering raw HTML', () => {
    expect(() => createGeneratedDocsComment({ generatedAt, source: '--><script>' })).toThrow(
      'YTCQ_DOCS_BUILD_SHA must be a hexadecimal Git revision.'
    );
  });
});
