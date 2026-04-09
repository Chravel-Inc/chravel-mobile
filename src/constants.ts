import { Platform } from "react-native";

export const WEB_APP_URL = "https://chravel.app";

export const IS_TABLET = Platform.OS === "ios" && Platform.isPad === true;

/** Scale a dimension up for tablet screens (1.3x on iPad, 1x elsewhere). */
export function tabletScale(value: number): number {
  return IS_TABLET ? Math.round(value * 1.3) : value;
}

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

export const COLORS = {
  background: "#191817",
  brandBlue: "#3A60D0",
} as const;

// Legal URLs — shown on the terms agreement screen before signup.
export const TERMS_URL = "https://chravel.app/terms";
export const PRIVACY_URL = "https://chravel.app/privacy";
