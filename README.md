<p>
  <img src="apps/extension/src/assets/icons/icon-128.png" alt="Chat Enhancer for YouTube icon" width="96" height="96">
</p>

# Chat Enhancer for YouTube

<p>
  <a href="https://www.chatenhancer.com/chrome"><img alt="chrome" src="https://img.shields.io/chrome-web-store/v/pkhaaipeppfpakofgpdpcpkflangpghf?label=chrome&logo=googlechrome&color=4285f4"></a>
  <a href="https://www.chatenhancer.com/firefox"><img alt="firefox" src="https://img.shields.io/amo/v/chat-enhancer-for-youtube?label=firefox&logo=firefoxbrowser&color=ff7139"></a>
  <a href="https://www.chatenhancer.com/safari"><img alt="safari" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fitunes.apple.com%2Flookup%3Fid%3D6783276323%26country%3Dus&query=%24.results%5B0%5D.version&label=safari&logo=apple&color=6e6e73&cacheSeconds=300"></a>
  <a href="https://github.com/chat-enhancer-yt/youtube-chat-qol/actions/workflows/extension.yml"><img alt="Extension CI" src="https://img.shields.io/github/actions/workflow/status/chat-enhancer-yt/youtube-chat-qol/extension.yml?label=extension"></a>
</p>

[Website](https://www.chatenhancer.com) · [Privacy policy](https://www.chatenhancer.com/privacy)

Suite of enhancements that make YouTube live chat easier to follow and participate in.

The extension is free, open-source, requires no account, and does not run analytics.

Not affiliated with YouTube or Google.

## Preview

![Chat Enhancer for YouTube promo previews](screenshots/promo-grid.png)

## Development

Development requires Node.js 22.18 or newer so the private repository tooling can run TypeScript directly.

Install dependencies and build the unpacked extensions:

```sh
npm install
npm run build
```

Load it in a Chromium browser:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select `dist/extension-chrome`.

After source changes, run `npm run build` again and reload the unpacked extension.

For Firefox 140+ development, build the Firefox package, then choose **Load Temporary Add-on** at `about:debugging#/runtime/this-firefox` and select `dist/extension-firefox/manifest.json`:

```sh
npm run build:firefox
```

### Repository structure

This repository keeps every npm workspace under `apps/` or `packages/`. Deployable applications live under `apps/`; reusable code and private repository tooling live under `packages/`:

- `apps/extension`: browser extension source, manifest, and Playwright E2E tests.
- `apps/docs`: Astro documentation site.
- `apps/playground`: Playground Worker, Durable Objects, and Stockfish container.
- `apps/language-redirect`: documentation locale redirect Worker.
- `packages/playground-core`: protocol, identity, and game logic shared by the extension and Playground Worker.
- `packages/product-config`: locale and contact metadata shared by deployed applications.
- `packages/eslint-config`: shared ESLint policy composed by each workspace's local config.
- `packages/repo-tools`: private workspace for build, release, test, and store automation.

The root `package.json` owns the release version and keeps the short, user-facing orchestration commands such as `npm run check`, `npm run test`, and `npm run verify`. Each workspace exposes its own implementation commands through npm scripts, owns its ESLint config, and opts into the aggregate Vitest suite with a colocated `vitest.unit.config.ts` when needed.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).

Third-party icon and font notices are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The `Chat Enhancer for YouTube` name, logo, and store listing assets are not licensed for use in a way that suggests an official release or endorsement.
