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
    expect(createE2eTestPlan(['--project=youtube-live', '-g', 'logged-in'])).toEqual({
      playwrightArgs: [
        'test',
        '--config=apps/extension/playwright.config.ts',
        '--project=youtube-live',
        '-g',
        'logged-in'
      ],
      reportOutputFolder: 'playwright-report/youtube-live',
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
    expect(createE2eTestPlan(['--project', 'youtube-live'])).toEqual({
      playwrightArgs: [
        'test',
        '--config=apps/extension/playwright.config.ts',
        '--project',
        'youtube-live'
      ],
      reportOutputFolder: 'playwright-report/youtube-live',
      shouldBuild: true
    });
  });
});
