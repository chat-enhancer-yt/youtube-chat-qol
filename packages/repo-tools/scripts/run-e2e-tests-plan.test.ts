import { describe, expect, it } from 'vitest';
import { createE2eTestPlan } from './run-e2e-tests-plan.ts';

describe('end-to-end test command planner', () => {
  it('builds before running Playwright by default', () => {
    expect(createE2eTestPlan(['--project=youtube-mock'])).toEqual({
      playwrightArgs: [
        'test',
        '--config=apps/extension/playwright.config.ts',
        '--project=youtube-mock'
      ],
      reportOutputFolder: 'playwright-report/youtube-mock',
      shouldBuild: true
    });
  });

  it('uses existing build output when --no-build is present', () => {
    expect(createE2eTestPlan(['--project=youtube-mock', '--no-build'])).toEqual({
      playwrightArgs: [
        'test',
        '--config=apps/extension/playwright.config.ts',
        '--project=youtube-mock'
      ],
      reportOutputFolder: 'playwright-report/youtube-mock',
      shouldBuild: false
    });
  });

  it('preserves extra Playwright arguments after the npm command separator', () => {
    expect(createE2eTestPlan(['--project=youtube-real-logged-in', '-g', 'logged-in'])).toEqual({
      playwrightArgs: [
        'test',
        '--config=apps/extension/playwright.config.ts',
        '--project=youtube-real-logged-in',
        '-g',
        'logged-in'
      ],
      reportOutputFolder: 'playwright-report/youtube-real-logged-in',
      shouldBuild: true
    });
  });

  it('uses the combined report folder when all projects run together', () => {
    expect(createE2eTestPlan([])).toEqual({
      playwrightArgs: [
        'test',
        '--config=apps/extension/playwright.config.ts'
      ],
      reportOutputFolder: 'playwright-report/e2e',
      shouldBuild: true
    });
  });

  it('supports the spaced --project argument form', () => {
    expect(createE2eTestPlan(['--project', 'youtube-real-logged-out'])).toEqual({
      playwrightArgs: [
        'test',
        '--config=apps/extension/playwright.config.ts',
        '--project',
        'youtube-real-logged-out'
      ],
      reportOutputFolder: 'playwright-report/youtube-real-logged-out',
      shouldBuild: true
    });
  });

  it.each([
    ['extension-pages', 'playwright-report/extension-pages'],
    ['integrations', 'playwright-report/integrations']
  ])('uses the dedicated report folder for the %s project', (project, reportOutputFolder) => {
    expect(createE2eTestPlan([`--project=${project}`])).toEqual({
      playwrightArgs: [
        'test',
        '--config=apps/extension/playwright.config.ts',
        `--project=${project}`
      ],
      reportOutputFolder,
      shouldBuild: true
    });
  });

  it('uses the combined report folder for an explicit multi-project tier', () => {
    expect(createE2eTestPlan([
      '--project=youtube-mock',
      '--project=extension-pages',
      '--project=youtube-real-logged-out'
    ])).toEqual({
      playwrightArgs: [
        'test',
        '--config=apps/extension/playwright.config.ts',
        '--project=youtube-mock',
        '--project=extension-pages',
        '--project=youtube-real-logged-out'
      ],
      reportOutputFolder: 'playwright-report/e2e',
      shouldBuild: true
    });
  });
});
