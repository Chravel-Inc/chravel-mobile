# CLAUDE.md — chravel-mobile

## What this repo is

This is the **native mobile shell only** — an Expo/React Native app (~1,500 lines of TypeScript) that wraps the Chravel web platform (`https://chravel.app`) in a WebView and bridges native device capabilities. The actual product UI, business logic, backend, database, AI orchestration, and design system live in the **companion repo**: `Chravel-Inc/ChravelApp`.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Expo / React Native Shell (this repo)          │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  WebView → https://chravel.app/auth        │ │
│  │  (all product UI comes from the web app)   │ │
│  └──────────────────┬─────────────────────────┘ │
│                     │ JSON bridge protocol       │
│         postMessage ↕ injectJavaScript           │
│  ┌──────────────────┴─────────────────────────┐ │
│  │  Native Modules                            │ │
│  │  ├─ Biometrics (Face ID / Touch ID)        │ │
│  │  ├─ Push Notifications (APNs / FCM)        │ │
│  │  ├─ RevenueCat (in-app subscriptions)      │ │
│  │  ├─ Voice Audio (capture + playback)       │ │
│  │  ├─ Haptics                                │ │
│  │  ├─ Deep Linking (chravel:// + universal)   │ │
│  │  └─ Native Share Sheet                     │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
         │
         ▼ Backend (in ChravelApp repo)
   Supabase · Vercel · Stripe · Vertex AI
```

## File map

| File | Role |
|---|---|
| `App.tsx` | Root component — biometric lock, terms, push prompt, error state |
| `src/ChravelWebView.tsx` | **Core** — WebView config, bridge handler, OAuth interception, deep links |
| `src/bridge.ts` | **Core** — bridge protocol types and message building |
| `src/voiceBridge.ts` | Voice audio orchestrator (capture + playback ↔ WebView) |
| `src/revenuecat.ts` | RevenueCat SDK: configure, identify, purchase, restore |
| `src/notifications.ts` | Push notification registration + deep link routing |
| `src/deepLinking.ts` | URL parsing for `chravel://` and `https://chravel.app` |
| `src/biometrics.ts` | Face ID / Touch ID detection and authentication |
| `src/haptics.ts` | Haptic feedback trigger |
| `src/constants.ts` | URLs, entitlement IDs, push types |
| `src/LockScreen.tsx` | Biometric lock UI |
| `src/ErrorScreen.tsx` | Network error UI with retry |
| `src/PushPrePrompt.tsx` | Push notification opt-in screen |
| `src/TermsAgreement.tsx` | Terms & privacy acceptance screen |
| `src/audio/capture.ts` | Microphone recording — 200ms chunks, PCM16, 16kHz |
| `src/audio/playback.ts` | Audio playback — gapless queue, barge-in, 24kHz |
| `src/audio/utils.ts` | WAV header generation, base64 conversion, RMS calculation |
| `src/audio/constants.ts` | Audio sample rates and intervals |
| `app.config.js` | Expo config: permissions, deep links, privacy manifest, entitlements |
| `eas.json` | EAS build profiles (dev, preview, production) + submit config |
| `.github/workflows/eas-build.yml` | CI: build iOS + auto-submit TestFlight on push to main |

## Bridge protocol contract

Any changes here **must** be coordinated with the web app in `ChravelApp`.

### Web → Native (via `window.ReactNativeWebView.postMessage`)

| Message type | Payload | Purpose |
|---|---|---|
| `ready` | — | Web app finished loading |
| `haptic` | `style: light\|medium\|heavy\|success\|warning\|error` | Trigger haptic feedback |
| `push:register` | — | Request native push token |
| `push:unregister` | — | Revoke push registration |
| `revenuecat:identify` | `userId` | Link Supabase user to RevenueCat |
| `revenuecat:purchase` | `packageId` | Purchase a subscription |
| `revenuecat:restore` | — | Restore purchases |
| `revenuecat:getCustomerInfo` | — | Get active entitlements |
| `share` | `text?, url?, title?` | Open native share sheet |
| `voice:request-permission` | — | Request microphone permission |
| `voice:start-capture` | — | Begin audio recording |
| `voice:stop-capture` | — | Stop audio recording |
| `voice:play-audio` | `audio (base64), sampleRate?` | Play AI response audio |
| `voice:flush-playback` | — | Stop playback + clear queue (barge-in) |

### Native → Web (via `window.dispatchEvent(new CustomEvent(...))`)

| Event name | Detail | Purpose |
|---|---|---|
| `chravel:native-ready` | — | Native shell initialized |
| `chravel:push-token` | `token, error?` | Push token result |
| `chravel:push-unregistered` | `success` | Unregistration ack |
| `chravel:purchase-result` | `success, error?` | Purchase outcome |
| `chravel:restore-result` | `success, error?` | Restore outcome |
| `chravel:customer-info` | `entitlements[]` | Active entitlements |
| `chravel:voice-permission` | `granted, canAskAgain` | Mic permission result |
| `chravel:voice-audio-data` | `audio (base64), rms, timestamp` | Mic chunk captured |
| `chravel:voice-capture-started` | — | Recording started |
| `chravel:voice-capture-stopped` | — | Recording stopped |
| `chravel:voice-playback-rms` | `rms` | Playback volume level |
| `chravel:voice-playback-complete` | — | Queue drained |
| `chravel:voice-playback-flushed` | — | Barge-in complete |
| `chravel:voice-error` | `error, code` | Audio pipeline error |

### Injected globals

The native shell injects these before page load (`buildInjectedJS` in `bridge.ts`):
- `window.ChravelNative` — `{ platform: "ios"|"android", isNative: true, version: "1.0.0" }`
- `window.ChravelNativeAudio` — `{ isAvailable, requestPermission(), startCapture(), stopCapture(), playAudio(base64, sampleRate), flushPlayback() }`

## Commands

```bash
npm start          # Expo dev server
npm run ios        # Run on iOS
npm run android    # Run on Android
npm test           # Jest unit tests (27 tests across 3 files)
```

Build & deploy is handled by EAS (see CI/CD section).

## Tech stack

- **Expo SDK 55** / React Native 0.83.2 / React 19.2.0
- **TypeScript 5.9.2** (strict mode)
- **react-native-webview 13.16.1** — hosts the web app
- **react-native-purchases 9.14.0** — RevenueCat subscriptions
- **expo-audio** — voice capture/playback for Gemini Live
- **expo-notifications** — APNs/FCM push
- **expo-local-authentication** — biometric auth
- **Jest 30.3.0 + ts-jest** — testing

## Environment variables

| Variable | Where used | Purpose |
|---|---|---|
| `REVENUECAT_IOS_API_KEY` | `app.config.js` → `revenuecat.ts` | RevenueCat iOS key (client-safe) |
| `REVENUECAT_ANDROID_API_KEY` | `app.config.js` → `revenuecat.ts` | RevenueCat Android key (client-safe) |
| `EXPO_TOKEN` | GitHub Actions secret | EAS CI authentication |

No `.env` files are committed. RevenueCat keys are public client-side keys by design.

## CI/CD

Push to `main` → GitHub Actions → EAS Build (iOS production) → auto-submit to TestFlight.

- Workflow: `.github/workflows/eas-build.yml`
- **No test step in CI** — tests don't run before build
- **No Android CI** — only iOS is automated
- **No preview/PR builds**

## Conventions

- Functional components only, no class components
- `StyleSheet.create()` for all styling — no Tailwind, no CSS-in-JS
- Colors hardcoded: `#191817` (bg), `#3A60D0` (primary), `#FFFFFF` (text), `#999999` (muted)
- No React Navigation — routing is WebView URL-based via `navigateWebView(path)`
- No global state — `useState`/`useRef` only, no Redux/Zustand/Context
- Adding a new bridge capability: (1) add type to union in `bridge.ts`, (2) add handler in `ChravelWebView.tsx` switch, (3) optionally add response event
- Tests go in `src/__tests__/` with `.test.ts` extension

## Known limitations

- **Android voice capture is broken** — `expo-audio` can't produce PCM WAV on Android (`capture.ts` line 100-104 throws)
- **No offline support** — blank screen without internet
- **No crash reporting** — no Sentry/Bugsnag/Crashlytics
- **No staging environment** — web app changes go to production
- **No analytics** in the native shell
- **5-second loading timeout** — hardcoded fallback in `ChravelWebView.tsx` line 353

## Security notes

- **Apple OAuth secret expires ~September 2026** (generated 2026-03-26, 6-month lifespan) — see `TODO.md`
- **Demo credentials** in `REVIEW_NOTES.md` — `demo@chravel.app` for App Store review. Rotate after review.
- **Google Maps API key exposed in old repo git history** — `TODO.md` says it needs rotation
- **Ensure `Chravel-Inc/ChravelApp` has no secrets in git history** — flagged in `TODO.md`
- Bridge message parsing does type assertion without shape validation (`bridge.ts` line 123) — low risk since WebView only loads `chravel.app`

## Companion repo

The actual product lives at **`Chravel-Inc/ChravelApp`** — that's where the web app, Supabase backend, edge functions, AI orchestration, database migrations, and design system are. The only coupling point between repos is the bridge protocol documented above. Changes to bridge message types or `window.ChravelNative`/`window.ChravelNativeAudio` APIs must be coordinated across both repos.
