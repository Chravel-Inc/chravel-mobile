import * as Haptics from "expo-haptics";
import type { HapticStyle } from "./bridge";

const IMPACT_MAP: Record<string, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

const NOTIFICATION_MAP: Record<string, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

/**
 * Trigger haptic feedback matching the style the web app requested.
 */
export async function triggerHaptic(style: HapticStyle): Promise<void> {
  if (style in IMPACT_MAP) {
    await Haptics.impactAsync(IMPACT_MAP[style]);
  } else if (style in NOTIFICATION_MAP) {
    await Haptics.notificationAsync(NOTIFICATION_MAP[style]);
  }
}
