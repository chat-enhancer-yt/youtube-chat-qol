const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const commitPattern = /^[0-9a-f]{40,64}$/;

export function getGitHubSourceArchiveUrl(repository: string, commit: string) {
  if (!repositoryPattern.test(repository)) {
    throw new Error(`Invalid GitHub repository "${repository}".`);
  }
  if (!commitPattern.test(commit)) {
    throw new Error(`Invalid Git commit "${commit}".`);
  }

  return `https://github.com/${repository}/archive/${commit}.zip`;
}

export async function fetchGitHubSourceArchive({
  commit,
  repository,
  fetchImpl = fetch
}: {
  commit: string;
  repository: string;
  fetchImpl?: typeof fetch;
}) {
  const url = getGitHubSourceArchiveUrl(repository, commit);
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'application/zip'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub source archive download failed: ${response.status} ${response.statusText}`);
  }

  const archive = new Uint8Array(await response.arrayBuffer());
  if (archive.length < 4 || archive[0] !== 0x50 || archive[1] !== 0x4b) {
    throw new Error('GitHub source archive download did not return a ZIP file.');
  }

  return archive;
}
