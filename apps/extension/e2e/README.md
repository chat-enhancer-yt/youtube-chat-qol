# End-to-end tests

Playwright exercises the built Chrome extension through persistent browser profiles. Source paths
describe what is under test; Playwright projects separately describe how each group runs.

## Layout

- `specs/extension-pages`: extension-owned pages such as onboarding.
- `specs/youtube/mock`: deterministic YouTube fixtures, grouped by surface and simulated sign-in
  state.
- `specs/youtube/real`: current YouTube DOM checks, grouped by surface and actual sign-in state.
  Logged-in tests copy the prepared Chrome profile, may edit and restore drafts, and never send chat
  messages.
- `specs/integrations`: named third-party contracts that do not depend on YouTube DOM.
- `scenarios`: reusable user behavior and feature-local fixtures, assertions, and diagnostics.
- `support`: cross-feature browser lifecycle, storage, mocked endpoints, and page adapters.
- `performance`: separately configured mock and real-YouTube benchmarks.

Each directory level has one meaning: target, environment, YouTube surface, then sign-in state. The
Playwright projects in `playwright.config.ts` discover those paths. Package scripts select projects
rather than individual files, so new tests join the appropriate gate automatically.

## Isolation and parallelism

Browser launches are worker-scoped because loading an unpacked extension for every test is costly.
Test-scoped fixtures reset storage, pages, menus, transient extension surfaces, and composers before
each scenario. Normal tests therefore parallelize safely by spec file while `fullyParallel` remains
disabled. CI caps execution at four workers.

## Commands

- `npm run test:e2e:extension-pages`: extension-owned page tests.
- `npm run test:e2e:youtube:mock`: all deterministic mock YouTube tests.
- `npm run test:e2e:youtube:real:logged-out`: unattended real-YouTube compatibility.
- `npm run test:e2e:youtube:real:logged-in`: prepared-profile real-YouTube checks.
- `npm run test:e2e:integrations`: real third-party contracts.
- `npm run test:e2e:ci -w @chatenhancer/extension`: required deterministic and logged-out
  real-YouTube gates using an existing Chrome build.
- `npm run test:e2e:perf`: deterministic performance benchmarks.
- `npm run test:e2e:flake`: repeat a selected normal suite while investigating flakiness.

Prepare the signed-in profile with
`npm run test:e2e:youtube-login -w @chatenhancer/extension` before running real logged-in tests.

The scheduled GitHub Actions run builds Chrome and executes the real logged-out and integration
projects. Pull requests and pushes run deterministic and real logged-out checks as independent
parallel jobs; their JSON reports are merged in the final workflow summary. Real logged-in and
performance tests remain explicit because they require local state or dedicated performance
conditions.
