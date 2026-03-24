# Chravel Mobile — Remaining Work

## Before First Build
- [ ] Run `eas init` to get real EAS project ID (replace placeholder in `app.config.ts`)
- [ ] Fill in Apple Team ID and ASC App ID in `eas.json` submit config
- [ ] Add Google Play service account JSON for Android submission
- [ ] Set RevenueCat production API keys (iOS + Android) as env vars
- [ ] Verify `X-Frame-Options` / CSP headers on chravel.app don't block Android WebView

## App Store Approval
- [ ] Biometric auth (Face ID / Touch ID) gate before showing WebView
- [ ] Native push permission pre-prompt screen (explain value before OS prompt)
- [ ] App Store review notes explaining native integrations

## Web App Changes (chravel repo)
- [ ] Bridge adapter: detect `window.ChravelNative` and route native calls through `postMessage` when Capacitor is unavailable
- [ ] Web app sends `{ type: "ready" }` message after auth hydration completes

## Infrastructure
- [ ] Set up staging environment for chravel.app (separate Vercel deploy) so mobile app can test against non-production

## Testing
- [ ] EAS development build on physical iOS device
- [ ] EAS development build on physical Android device
- [ ] Test push notification registration + delivery on both platforms
- [ ] Test RevenueCat purchase flow on both platforms
- [ ] Test deep link handling (cold start + warm start) on both platforms
- [ ] Test OAuth flows (Google + Apple) complete correctly in WebView
- [ ] Test offline → online recovery
- [ ] Test cookie/localStorage persistence across app restarts
