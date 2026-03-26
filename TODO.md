# Chravel Mobile — Remaining Work

## Blocked on Chikwendu
- [ ] `VITE_GOOGLE_MAPS_API_KEY` value — need access to Google Cloud Console
- [ ] Rotate Google Maps API key `AIzaSyAz3ra...` in Google Cloud Console (exposed in old repo git history)

## Before Store Submission
- [ ] Set RevenueCat production API keys (iOS + Android) as EAS env vars
- [ ] App Store review — submit with review notes (REVIEW_NOTES.md)

## Security
- [ ] Ensure new repo (Chravel-Inc/ChravelApp) has no secrets in git history

## Push Notifications
- [ ] Test push delivery on physical device

## Deep Linking
- [ ] Test universal links on physical device

## Features
- [ ] Bidirectional mic support — enable microphone access in WebView for AI Concierge voice conversations
- [ ] Verify payments loading correctly in WebView (Stripe checkout, RevenueCat)
- [ ] Verify Google Maps / Places loading correctly in WebView
- [ ] Update app icon to company logo

## Infrastructure
- [ ] Set up staging environment for chravel.app (separate Vercel deploy)

## Completed
- [x] Expo project scaffolded with EAS (@chravel/chravel)
- [x] App Store Connect listing created
- [x] Apple Team ID, ASC App ID filled in eas.json
- [x] Admin access on Chravel-Inc/ChravelApp repo
- [x] Biometric auth (Face ID / Touch ID) lock screen
- [x] Push notification pre-prompt screen
- [x] App Store review notes (REVIEW_NOTES.md)
- [x] Refactored App.tsx — extracted LockScreen, ErrorScreen, ChravelWebView
- [x] app.config.js with real EAS project ID
- [x] EAS development build on physical iOS device
- [x] Edge-to-edge WebView with safe area CSS injection
- [x] OAuth working in WebView (Safari user agent)
- [x] Vercel reconnected and deploying from Chravel-Inc/ChravelApp
- [x] TestFlight build submitted
- [x] APNs key created and uploaded to EAS + Supabase
- [x] Bridge adapter deployed
- [x] AASA file deployed for universal links

## Testing (Phase 2 — Android deferred)
- [ ] Test push notification registration + delivery
- [ ] Test RevenueCat purchase flow
- [ ] Test deep link handling (cold start + warm start)
- [ ] Test OAuth flows (Google + Apple) complete correctly in WebView
- [ ] Test offline → online recovery
- [ ] Test cookie/localStorage persistence across app restarts
