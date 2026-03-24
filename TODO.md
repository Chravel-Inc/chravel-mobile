# Chravel Mobile — Remaining Work

## Before First Build
- [x] Run `eas init` to get real EAS project ID (done — @chravel/chravel)
- [ ] Fill in Apple Team ID and ASC App ID in `eas.json` submit config
- [ ] Add Google Play service account JSON for Android submission
- [ ] Set RevenueCat production API keys (iOS + Android) as EAS env vars
- [ ] Verify `X-Frame-Options` / CSP headers on chravel.app don't block Android WebView

## Security
- [ ] Rotate Google Maps API key `AIzaSyAz3ra...` in Google Cloud Console (exposed in old repo git history) — or restrict to chravel.app domain only
- [ ] Ensure new repo (ChravelApp/ChravelApp) has no secrets in git history

## Code Quality
- [ ] Refactor App.tsx — extract lock screen, WebView, error screen into separate components

## App Store Approval
- [x] Biometric auth (Face ID / Touch ID) gate before showing WebView (PR #4)
- [ ] Native push permission pre-prompt screen (explain value before OS prompt)
- [ ] App Store review notes explaining native integrations

## Web App Changes (ChravelApp/ChravelApp repo)
- [x] Bridge adapter: detect `window.ChravelNative` and route native calls through `postMessage` (PR #2)
- [x] Web app sends `{ type: "ready" }` message after auth hydration completes (PR #2)
- [ ] Full-screen auth for native app — detect via `window.ChravelNative` (PR #1 — needs merge)
- [ ] AASA file with real Team ID for universal links (PR #3 — needs merge + deploy)

## Push Notifications
- [ ] Create APNs key in Apple Developer portal
- [ ] Upload APNs key to EAS
- [ ] Web app triggers push registration after user login via bridge
- [ ] Test push delivery on physical device

## Deep Linking
- [x] AASA file configured with Team ID and routes (PR #3)
- [ ] Deploy AASA to chravel.app (needs PR merge)
- [ ] Test universal links on physical device
- [ ] Host `assetlinks.json` for Android deep links (future)

## Infrastructure
- [ ] Set up staging environment for chravel.app (separate Vercel deploy) so mobile app can test against non-production
- [ ] Get admin access to ChravelApp/ChravelApp repo settings (for branch protection, secrets)

## Testing
- [x] EAS development build on physical iOS device
- [ ] EAS development build on physical Android device
- [ ] Test push notification registration + delivery on both platforms
- [ ] Test RevenueCat purchase flow on both platforms
- [ ] Test deep link handling (cold start + warm start) on both platforms
- [ ] Test OAuth flows (Google + Apple) complete correctly in WebView
- [ ] Test offline → online recovery
- [ ] Test cookie/localStorage persistence across app restarts
