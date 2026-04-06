# App Store Review Notes — Chravel

## Demo Account

```
Email: demo@chravel.app
Password: DemoTrip2025!
```

This account has pre-populated data to showcase all features.

## Native Integrations

This app uses a WebView to deliver our web platform alongside the following native capabilities that require a native app:

1. **Terms & Privacy Agreement** — Before account creation, the app presents a native consent screen requiring users to agree to the Terms of Use and Privacy Policy via a checkbox. This is persisted locally so returning users are never prompted again.

2. **Push Notifications (APNs)** — Users receive native push notifications for chat messages, trip updates, expense split requests, and calendar changes. After first launch, the app presents a pre-permission screen explaining notification value before requesting OS permission.

3. **AI Voice Concierge (Native Audio)** — The AI travel assistant uses native audio capture and playback (via expo-audio on iOS and expo-audio-stream on Android) for real-time voice conversations. This bypasses WKWebView's unreliable Web Audio API, providing low-latency 200ms audio chunks with gapless playback and barge-in support.

4. **Haptic Feedback** — Trip interactions (reactions, confirmations, navigation) trigger native haptic feedback for a tactile experience not possible in a browser.

5. **Native Share Sheet** — Users can share trip invites and media via the native iOS share sheet.

6. **Deep Linking / Universal Links** — Links to `chravel.app/trip/*`, `chravel.app/join/*`, etc. open directly in the app. The `chravel://` custom URL scheme is also supported.

7. **In-App Purchases (RevenueCat)** — Subscription tiers (Explorer, Frequent Chraveler) are managed through RevenueCat with native StoreKit integration.

## Review Path

1. **Launch** → Terms agreement screen (agree to Terms & Privacy)
2. **Push prompt** → "Stay in the Loop" screen explains notification value
3. **Sign in** → Use demo credentials above
4. **Home** → Sample trips visible, tap any trip to explore
5. **Chat** → Real-time group messaging with reactions
6. **Calendar** → Trip events and agenda view
7. **Expenses** → Payment splits and balance tracking
8. **AI Concierge** → AI travel assistant with voice support (tap the AI tab, then the mic icon)
9. **Share** → Tap share icon on any trip to test native share sheet

## Technical Notes

- Built with Expo (React Native) wrapping our web platform
- Minimum iOS version: 15.1
- No third-party tracking or advertising SDKs
- Privacy manifest (PrivacyInfo.xcprivacy) included with all required API declarations
- App does not use IDFA or ATT framework
