# AGENTS.md — chravel-mobile

## Cursor Cloud specific instructions

This is an Expo/React Native mobile shell (~1,500 LoC TypeScript) that wraps the Chravel web app in a WebView. All product UI and backend live in the companion repo `Chravel-Inc/ChravelApp`. See `CLAUDE.md` for the full architecture, bridge protocol, and file map.

### Quick reference

| Task | Command |
|---|---|
| Install deps | `npm install` |
| Type check | `npx tsc --noEmit` |
| Run tests | `npm test` (Jest, 62 tests across 5 files, runs in Node — no device needed) |
| Start dev server | `npm start` (Expo/Metro on port 8081) |
| Verify bundle compiles | `curl -s http://localhost:8081/status` should return `packager-status:running` |

### Non-obvious caveats

- **No ESLint/Prettier configured** — there is no lint script. Type checking (`npx tsc --noEmit`) is the primary static analysis.
- **No `.nvmrc` or engine pinning** — Node 22.x works. The project uses `npm` (no lockfile for yarn/pnpm/bun).
- **No local backend** — the WebView loads production `https://chravel.app`. There is no staging environment and no way to run the backend locally from this repo.
- **Native builds require macOS + Xcode (iOS) or Android Studio (Android)** — neither is available in Cloud Agent VMs. Testing is limited to: type checking, Jest tests, and verifying Metro bundler starts and compiles the JS bundle.
- **Tests mock all native modules** — Jest runs purely in Node with `ts-jest`. Native APIs (WebView, RevenueCat, expo-audio, etc.) are mocked in each test file. No emulator/simulator needed.
- **RevenueCat env vars are optional** — `REVENUECAT_IOS_API_KEY` and `REVENUECAT_ANDROID_API_KEY` default to empty strings. The app runs without them.
- **`expo start` shows a QR code** — in a headless VM this is expected; the dev server is still functional and the bundle is served over HTTP.
