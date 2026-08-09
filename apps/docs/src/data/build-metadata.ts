const docsGeneratedAt = new Date();

export const generatedDocsComment = createGeneratedDocsComment({
  generatedAt: docsGeneratedAt,
  source: process.env.YTCQ_DOCS_BUILD_SHA
});

export function createGeneratedDocsComment({
  generatedAt,
  source
}: {
  generatedAt: Date;
  source?: string;
}) {
  const normalizedSource = source?.trim();
  if (normalizedSource && !/^[a-f0-9]{7,64}$/i.test(normalizedSource)) {
    throw new Error('YTCQ_DOCS_BUILD_SHA must be a hexadecimal Git revision.');
  }
  const sourceSuffix = normalizedSource ? `; source=${normalizedSource}` : '';
  return `<!-- ytcq-docs-generated: ${generatedAt.toISOString()}${sourceSuffix} -->`;
}
