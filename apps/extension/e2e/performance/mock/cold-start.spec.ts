/**
 * Deterministic cold-start coverage for the default content-script path.
 *
 * Every sample uses a fresh browser profile so the content bundle has not run
 * previously. Browser launch is intentionally excluded: the measured window
 * starts with chat navigation and ends when the first extension control is
 * usable.
 */
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type TestInfo
} from '@playwright/test';
import { closeExtensionContext, launchExtensionContext } from '../../support/chrome';
import { getExtensionServiceWorker } from '../../support/extension';
import { shouldRunHeadlessBrowserTest } from '../../support/fixtures/browser-session';
import {
  createLiveChatFixtureHtml,
  fixtureLoggedInLiveChatUrl
} from '../../support/live-chat-fixture';
import {
  createPerformanceReport,
  formatMs,
  getPositiveIntegerEnv,
  writePerformanceReport
} from '../../support/performance';

const SAMPLE_COUNT = getPositiveIntegerEnv('YTCQ_PERF_COLD_START_SAMPLES', 5);
const STARTUP_TIMEOUT_MS = 15_000;

const BUDGETS = {
  maxLongTaskMs: 500,
  p95ReadyAfterChatDomMs: 750,
  p95ReadyMs: 1_500
};

interface ColdStartSample {
  contentClaimAfterChatDomMs: number;
  maxLongTaskMs: number;
  readyAfterChatDomMs: number;
  readyAfterContentClaimMs: number;
  readyMs: number;
  startupLongTaskCount: number;
}

interface ColdStartProbeState {
  chatDomReadyMs: number | null;
  contentClaimMs: number | null;
  longTaskEntries: Array<{
    duration: number;
    startTime: number;
  }>;
  longTaskObserver: PerformanceObserver | null;
  readyMs: number | null;
}

type ColdStartProbeWindow = typeof window & {
  __ytcqColdStartProbe?: ColdStartProbeState;
};

test('youtube-mock performance: default content script reaches usable UI promptly', async ({
  browserName
}, testInfo) => {
  void browserName;
  const samples: ColdStartSample[] = [];

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    samples.push(await measureColdStart(testInfo, index));
  }

  const readyTimes = samples.map((sample) => sample.readyMs);
  const readyAfterChatDomTimes = samples.map((sample) => sample.readyAfterChatDomMs);
  const contentClaimAfterChatDomTimes = samples.map(
    (sample) => sample.contentClaimAfterChatDomMs
  );
  const readyAfterContentClaimTimes = samples.map(
    (sample) => sample.readyAfterContentClaimMs
  );
  const p95ReadyMs = getPercentile(readyTimes, 95);
  const p95ReadyAfterChatDomMs = getPercentile(readyAfterChatDomTimes, 95);
  const maxLongTaskMs = Math.max(...samples.map((sample) => sample.maxLongTaskMs));

  const report = createPerformanceReport(
    'youtube-mock cold default content-script startup across fresh browser profiles',
    [
      { label: 'Fresh-profile samples', value: SAMPLE_COUNT },
      {
        label: 'Median chat DOM to content claim',
        value: formatMs(getPercentile(contentClaimAfterChatDomTimes, 50))
      },
      {
        label: 'p95 chat DOM to content claim',
        value: formatMs(getPercentile(contentClaimAfterChatDomTimes, 95))
      },
      {
        label: 'Median navigation to usable UI',
        value: formatMs(getPercentile(readyTimes, 50))
      },
      {
        label: 'p95 navigation to usable UI',
        value: formatMs(p95ReadyMs),
        budget: formatMs(BUDGETS.p95ReadyMs)
      },
      {
        label: 'p95 chat DOM to usable UI',
        value: formatMs(p95ReadyAfterChatDomMs),
        budget: formatMs(BUDGETS.p95ReadyAfterChatDomMs)
      },
      {
        label: 'p95 content claim to usable UI',
        value: formatMs(getPercentile(readyAfterContentClaimTimes, 95))
      },
      {
        label: 'Startup long tasks',
        value: samples.reduce((total, sample) => total + sample.startupLongTaskCount, 0)
      },
      {
        label: 'Max startup long task',
        value: formatMs(maxLongTaskMs),
        budget: formatMs(BUDGETS.maxLongTaskMs)
      },
      {
        label: 'Usable UI samples',
        value: readyTimes.map((value) => formatMs(value)).join(', ')
      }
    ]
  );

  await writePerformanceReport(testInfo, 'youtube-mock-cold-start', report);

  expect.soft(
    p95ReadyMs,
    'The default extension UI should become usable promptly after navigation.'
  ).toBeLessThanOrEqual(BUDGETS.p95ReadyMs);
  expect.soft(
    p95ReadyAfterChatDomMs,
    'The extension should initialize promptly after the compatible chat DOM exists.'
  ).toBeLessThanOrEqual(BUDGETS.p95ReadyAfterChatDomMs);
  expect.soft(
    maxLongTaskMs,
    'Cold content-script startup should not create a catastrophic long task.'
  ).toBeLessThanOrEqual(BUDGETS.maxLongTaskMs);
});

async function measureColdStart(testInfo: TestInfo, sampleIndex: number): Promise<ColdStartSample> {
  const context = await launchExtensionContext({
    headless: shouldRunHeadlessBrowserTest(),
    profileDir: testInfo.outputPath('profiles', `cold-start-${sampleIndex + 1}`)
  });

  try {
    await getExtensionServiceWorker(context);
    await context.addInitScript(installColdStartProbe);
    await installFixtureRoutes(context);
    const page = await isolateMeasurementPage(context);

    await page.goto(fixtureLoggedInLiveChatUrl, {
      timeout: STARTUP_TIMEOUT_MS,
      waitUntil: 'commit'
    });
    await page.waitForFunction(
      () => typeof (window as ColdStartProbeWindow).__ytcqColdStartProbe?.readyMs === 'number',
      null,
      { timeout: STARTUP_TIMEOUT_MS }
    );
    await expect(page.locator('.ytcq-inbox-button')).toBeVisible({
      timeout: STARTUP_TIMEOUT_MS
    });

    return collectColdStartSample(page);
  } finally {
    await closeExtensionContext(context);
  }
}

async function installFixtureRoutes(context: BrowserContext): Promise<void> {
  await context.route(fixtureLoggedInLiveChatUrl, (route) => route.fulfill({
    body: createLiveChatFixtureHtml({ loggedIn: true }),
    contentType: 'text/html'
  }));
  await context.route('https://www.youtube.com/favicon.ico', (route) => route.fulfill({
    body: '',
    status: 204
  }));
}

async function isolateMeasurementPage(context: BrowserContext): Promise<Page> {
  const pages = context.pages();
  const page = pages[0] || await context.newPage();
  await Promise.all(pages.slice(1).map((extraPage) => extraPage.close()));
  await page.goto('about:blank', { timeout: STARTUP_TIMEOUT_MS, waitUntil: 'commit' });
  return page;
}

function installColdStartProbe(): void {
  const probeWindow = window as ColdStartProbeWindow;
  const state: ColdStartProbeState = {
    chatDomReadyMs: null,
    contentClaimMs: null,
    longTaskEntries: [],
    longTaskObserver: null,
    readyMs: null
  };
  probeWindow.__ytcqColdStartProbe = state;

  const recordMilestones = () => {
    const now = performance.now();
    if (state.chatDomReadyMs === null && document.querySelector('yt-live-chat-renderer')) {
      state.chatDomReadyMs = now;
    }
    if (
      state.contentClaimMs === null &&
      document.documentElement?.hasAttribute('data-ytcq-content-instance')
    ) {
      state.contentClaimMs = now;
    }
    if (state.readyMs === null && document.querySelector('.ytcq-inbox-button')) {
      state.readyMs = now;
    }
    if (
      state.chatDomReadyMs !== null &&
      state.contentClaimMs !== null &&
      state.readyMs !== null
    ) {
      mutationObserver.disconnect();
    }
  };

  const mutationObserver = new MutationObserver(recordMilestones);
  mutationObserver.observe(document, {
    attributes: true,
    attributeFilter: ['data-ytcq-content-instance'],
    childList: true,
    subtree: true
  });
  recordMilestones();

  try {
    state.longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        state.longTaskEntries.push({
          duration: entry.duration,
          startTime: entry.startTime
        });
      });
    });
    state.longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch {
    state.longTaskObserver = null;
  }
}

async function collectColdStartSample(page: Page): Promise<ColdStartSample> {
  return page.evaluate(() => {
    const state = (window as ColdStartProbeWindow).__ytcqColdStartProbe;
    if (
      !state ||
      state.chatDomReadyMs === null ||
      state.contentClaimMs === null ||
      state.readyMs === null
    ) {
      throw new Error('Cold-start probe did not observe every startup milestone.');
    }

    state.longTaskObserver?.takeRecords().forEach((entry) => {
      state.longTaskEntries.push({
        duration: entry.duration,
        startTime: entry.startTime
      });
    });
    state.longTaskObserver?.disconnect();
    const startupLongTasks = state.longTaskEntries.filter(
      (entry) => entry.startTime <= state.readyMs!
    );

    return {
      contentClaimAfterChatDomMs: Math.max(
        0,
        state.contentClaimMs - state.chatDomReadyMs
      ),
      maxLongTaskMs: startupLongTasks.length
        ? Math.max(...startupLongTasks.map((entry) => entry.duration))
        : 0,
      readyAfterChatDomMs: Math.max(0, state.readyMs - state.chatDomReadyMs),
      readyAfterContentClaimMs: Math.max(0, state.readyMs - state.contentClaimMs),
      readyMs: state.readyMs,
      startupLongTaskCount: startupLongTasks.length
    };
  });
}

function getPercentile(values: number[], percentile: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((percentile / 100) * sorted.length) - 1
  );
  return sorted[index] || 0;
}
