# Chravel Mobile — Remaining Work

## Blocked on Chikwendu
- [ ] Admin access on `ChravelApp/ChravelApp` repo (GitHub Secrets, branch protection, Vercel reconnection)
- [ ] `VITE_GOOGLE_MAPS_API_KEY` value — need access to Google Cloud Console or Vercel env vars from old project
- [ ] Rotate Google Maps API key `AIzaSyAz3ra...` in Google Cloud Console (exposed in old repo git history)

## Before First Build
- [x] Run `eas init` to get real EAS project ID (done — @chravel/chravel)
- [x] App Store Connect listing created
- [ ] Fill in Apple Team ID and ASC App ID in `eas.json` submit config
- [ ] Add Google Play service account JSON for Android submission
- [ ] Set RevenueCat production API keys (iOS + Android) as EAS env vars
- [ ] Verify `X-Frame-Options` / CSP headers on chravel.app don't block Android WebView

## Security
- [ ] Ensure new repo (ChravelApp/ChravelApp) has no secrets in git history

## Code Quality
- [ ] Refactor App.tsx — extract lock screen, WebView, error screen into separate components

## App Store Approval
- [x] Biometric auth (Face ID / Touch ID) gate before showing WebView
- [ ] Native push permission pre-prompt screen (explain value before OS prompt)
- [ ] App Store review notes explaining native integrations

## Web App Changes (ChravelApp/ChravelApp repo)
- [x] Bridge adapter: detect `window.ChravelNative` and route native calls through `postMessage`
- [x] Web app sends `{ type: "ready" }` message after auth hydration completes
- [x] Full-screen auth for native app — detect via `window.ChravelNative`
- [x] AASA file with real Team ID for universal links
- [x] Push registration trigger after login (PR #4)

## Push Notifications
- [x] Create APNs key in Apple Developer portal
- [x] Upload APNs key to EAS
- [x] Add APNs secrets to Supabase Edge Functions (APNS_PRIVATE_KEY, APNS_KEY_ID, APNS_TEAM_ID)
- [x] Web app triggers push registration after user login via bridge
- [ ] Test push delivery on physical device

## Deep Linking
- [x] AASA file configured with Team ID and routes
- [ ] Deploy AASA to chravel.app (needs Vercel deploy)
- [ ] Test universal links on physical device
- [ ] Host `assetlinks.json` for Android deep links (future)

## Infrastructure
- [ ] Set up staging environment for chravel.app (separate Vercel deploy)
- [ ] Reconnect Vercel to ChravelApp/ChravelApp repo

## Testing
- [x] EAS development build on physical iOS device
- [ ] EAS development build on physical Android device
- [ ] Test push notification registration + delivery on both platforms
- [ ] Test RevenueCat purchase flow on both platforms
- [ ] Test deep link handling (cold start + warm start) on both platforms
- [ ] Test OAuth flows (Google + Apple) complete correctly in WebView
- [ ] Test offline → online recovery
- [ ] Test cookie/localStorage persistence across app restarts
