# App Store Review Notes — Chravel

## Demo Account

```
Email: demo@chravel.app
Password: DemoTrip2025!
```

This account has pre-populated data to showcase all features.

## Native Integrations

This app uses a WebView to deliver our web platform alongside the following native capabilities that require a native app:

1. **Biometric Authentication (Face ID / Touch ID)** — The app requires biometric authentication on launch and when returning from background. This protects user trip data, payment information, and private group chats.

2. **Push Notifications (APNs)** — Users receive native push notifications for chat messages, trip updates, expense split requests, and calendar changes. After first login, the app presents a pre-permission screen explaining notification value before requesting OS permission.

3. **Haptic Feedback** — Trip interactions (reactions, confirmations, navigation) trigger native haptic feedback for a tactile experience not possible in a browser.

4. **Native Share Sheet** — Users can share trip invites and media via the native iOS share sheet.

5. **Deep Linking / Universal Links** — Links to `chravel.app/trip/*`, `chravel.app/join/*`, etc. open directly in the app. The `chravel://` custom URL scheme is also supported.

6. **In-App Purchases (RevenueCat)** — Subscription tiers (Explorer, Frequent Chraveler) are managed through RevenueCat with native StoreKit integration.

## Review Path

1. **Launch** → Biometric auth prompt (Face ID or Touch ID)
2. **Push prompt** → "Stay in the Loop" screen explains notification value
3. **Sign in** → Use demo credentials above
4. **Home** → Sample trips visible, tap any trip to explore
5. **Chat** → Real-time group messaging with reactions
6. **Calendar** → Trip events and agenda view
7. **Expenses** → Payment splits and balance tracking
8. **AI Concierge** → AI travel assistant (tap the AI tab)
9. **Share** → Tap share icon on any trip to test native share sheet

## Technical Notes

- Built with Expo (React Native) wrapping our web platform
- Minimum iOS version: 15.1
- No third-party tracking or advertising SDKs
- Privacy manifest (PrivacyInfo.xcprivacy) included with all required API declarations
- App does not use IDFA or ATT framework
