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
- [ ] Test universal links on physical device — AASA is deployed with paths for `/join/*`, `/trip/*`, `/event/*`, `/auth`, `/settings/*`. To test: (1) text yourself a link like `https://chravel.app/join/test123` and tap it — it should open in the app, not Safari. (2) Test cold start: force-quit the app, tap a link, verify the app launches and navigates to the right screen. (3) Test warm start: with the app in background, tap a link and verify it navigates correctly. If Universal Links don't fire, check Settings → Chravel → Associated Domains and ensure `applinks:chravel.app` is listed.
- [ ] Test deep link handling (cold start + warm start)

## Features
- [ ] Bidirectional mic support — WebView config is in place, needs physical device testing
- [ ] Update app icon to company logo
- [ ] Bottom padding for pages in WebView — current `env(safe-area-inset-bottom, 34px)` may need adjustment

## Apple Sign In
- [ ] Apple OAuth secret key expires every 6 months — regenerate before expiry (generated 2026-03-26)
- [ ] Test Apple Sign In on mobile app

## Infrastructure
- [ ] Set up staging environment for chravel.app (separate Vercel deploy)
- [ ] ~120 stale Codex branches on GitHub need cleanup

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
- [x] Google OAuth — opens in Safari, redirects back via chravel:// deep link (2026-03-26)
- [x] OAuth loading overlay — hides marketing page flash during auth (2026-03-26)
- [x] Repeat login support — timestamp in redirect URL prevents iOS dedup (2026-03-26)
- [x] Deep link URL parsing fix — custom scheme hostname correctly extracted (2026-03-26)
- [x] Apple Sign In enabled in Supabase with Service ID + JWT secret (2026-03-26)
- [x] Web app OAuth redirect fix — both providers redirect to /auth instead of landing page (2026-03-26)
- [x] Verify payments in WebView — Stripe domains whitelisted, RevenueCat bridge wired up (2026-03-26)
- [x] Verify Google Maps in WebView — domains whitelisted, geolocation enabled, maps loading (2026-03-26)

## Testing (Phase 2 — Android deferred)
- [ ] Test push notification registration + delivery
- [ ] Test RevenueCat purchase flow
- [x] Test OAuth flows (Google + Apple) — Google working, Apple enabled (2026-03-26)
- [ ] Test offline → online recovery
- [ ] Test cookie/localStorage persistence across app restarts
