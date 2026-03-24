export const WEB_APP_URL = "https://chravel.app";

// Custom user agent appended to WebView requests so the web app
// can detect it's running inside the native shell.
export const NATIVE_USER_AGENT_SUFFIX = "ChravelNative/1.0";

// RevenueCat entitlement IDs — must match the web app's
// src/constants/revenuecat.ts and the RevenueCat dashboard.
export const ENTITLEMENTS = {
  explorer: "chravel_explorer",
  frequentChraveler: "chravel_frequent_chraveler",
} as const;

// Push notification payload types the backend sends.
export const PUSH_TYPES = [
  "chat_message",
  "trip_update",
  "poll_update",
  "task_update",
  "calendar_event",
  "broadcast",
] as const;

export type PushType = (typeof PUSH_TYPES)[number];
