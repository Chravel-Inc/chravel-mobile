# Chravel Mobile — Remaining Work

## Blocked on Chikwendu
- [ ] Admin access on `Chravel-Inc/ChravelApp` repo (GitHub Secrets, branch protection)
- [ ] `VITE_GOOGLE_MAPS_API_KEY` value — need access to Google Cloud Console
- [ ] Rotate Google Maps API key `AIzaSyAz3ra...` in Google Cloud Console (exposed in old repo git history)

## Before Store Submission
- [ ] Add Google Play service account JSON for Android submission
- [ ] Set RevenueCat production API keys (iOS + Android) as EAS env vars

## Security
- [ ] Ensure new repo (Chravel-Inc/ChravelApp) has no secrets in git history

## App Store Approval
- [ ] TestFlight submission (EAS production build in progress)
- [ ] App Store review — submit with review notes (REVIEW_NOTES.md)

## Web App Changes (Chravel-Inc/ChravelApp repo)
- [x] Bridge adapter: detect `window.ChravelNative` and route native calls through `postMessage`
- [x] Web app sends `{ type: "ready" }` message after auth hydration completes
- [x] Full-screen auth for native app — detect via `window.ChravelNative`
- [x] AASA file with real Team ID for universal links
- [x] Push registration trigger after login
- [x] Vercel deployed with all changes

## Push Notifications
- [x] Create APNs key in Apple Developer portal
- [x] Upload APNs key to EAS
- [x] Add APNs secrets to Supabase Edge Functions
- [x] Web app triggers push registration after user login via bridge
- [ ] Test push delivery on physical device

## Deep Linking
- [x] AASA file configured with Team ID and routes
- [x] AASA deployed to chravel.app
- [ ] Test universal links on physical device
- [ ] Host `assetlinks.json` for Android deep links (future)

## Features
- [ ] Bidirectional mic support — enable microphone access in WebView for AI Concierge voice conversations
- [ ] Verify payments loading correctly in WebView (Stripe checkout, RevenueCat)
- [ ] Verify Google Maps / Places loading correctly in WebView

## Infrastructure
- [ ] Set up staging environment for chravel.app (separate Vercel deploy)

## Completed
- [x] Expo project scaffolded with EAS (@chravel/chravel)
- [x] App Store Connect listing created
- [x] Apple Team ID, ASC App ID filled in eas.json
- [x] Biometric auth (Face ID / Touch ID) lock screen
- [x] Push notification pre-prompt screen
- [x] App Store review notes (REVIEW_NOTES.md)
- [x] Refactored App.tsx — extracted LockScreen, ErrorScreen, ChravelWebView
- [x] app.config.js with real EAS project ID
- [x] EAS development build on physical iOS device
- [x] Edge-to-edge WebView with safe area CSS injection
- [x] OAuth working in WebView (Safari user agent)
- [x] Vercel reconnected and deploying from Chravel-Inc/ChravelApp

## Testing
- [ ] EAS development build on physical Android device
- [ ] Test push notification registration + delivery on both platforms
- [ ] Test RevenueCat purchase flow on both platforms
- [ ] Test deep link handling (cold start + warm start) on both platforms
- [ ] Test OAuth flows (Google + Apple) complete correctly in WebView
- [ ] Test offline → online recovery
- [ ] Test cookie/localStorage persistence across app restarts
