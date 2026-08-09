/*
 * Pure command planning for end-to-end tests.
 *
 * Kept separate from process spawning so command-line behavior can be unit
 * tested without launching Playwright or rebuilding the extension.
 */
const COMBINED_REPORT_DIR = 'playwright-report/e2e';
const PROJECT_REPORT_DIRS = new Map([
  ['extension-pages', 'playwright-report/extension-pages'],
  ['integrations', 'playwright-report/integrations'],
  ['youtube-mock', 'playwright-report/youtube-mock'],
  ['youtube-live-logged-in', 'playwright-report/youtube-live-logged-in'],
  ['youtube-live-logged-out', 'playwright-report/youtube-live-logged-out'],
  ['youtube-replay-logged-in', 'playwright-report/youtube-replay-logged-in']
]);

export function createE2eTestPlan(args: string[]) {
  const shouldBuild = !args.includes('--no-build');
  const playwrightArgs = [
    'test',
    '--config=apps/extension/playwright.config.ts',
    ...args.filter((arg) => arg !== '--no-build')
  ];

  return {
    playwrightArgs,
    reportOutputFolder: getReportOutputFolder(playwrightArgs),
    shouldBuild
  };
}

function getReportOutputFolder(playwrightArgs: string[]) {
  const projects = new Set<string>();
  for (let index = 0; index < playwrightArgs.length; index += 1) {
    const arg = playwrightArgs[index];
    if (arg === '--project' && typeof playwrightArgs[index + 1] === 'string') {
      projects.add(playwrightArgs[index + 1]);
    } else if (arg.startsWith('--project=')) {
      projects.add(arg.slice('--project='.length));
    }
  }

  if (projects.size !== 1) return COMBINED_REPORT_DIR;

  const [project] = projects;
  return PROJECT_REPORT_DIRS.get(project) ?? COMBINED_REPORT_DIR;
}
