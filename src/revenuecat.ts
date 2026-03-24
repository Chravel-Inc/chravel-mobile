import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { ENTITLEMENTS } from "./constants";

let isConfigured = false;

/**
 * Initialize RevenueCat. Call once on app startup.
 * No-ops if API key is missing (allows dev builds without keys).
 */
export async function configureRevenueCat(): Promise<void> {
  if (isConfigured) return;

  const apiKey =
    Platform.OS === "ios"
      ? Constants.expoConfig?.extra?.revenueCatIosApiKey
      : Constants.expoConfig?.extra?.revenueCatAndroidApiKey;

  if (!apiKey) {
    console.warn("[RevenueCat] No API key configured for", Platform.OS);
    return;
  }

  Purchases.configure({ apiKey });

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  isConfigured = true;
}

/**
 * Identify the RevenueCat user (call after Supabase auth resolves).
 * The web app sends the Supabase user ID via the bridge.
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!isConfigured) return;
  await Purchases.logIn(userId);
}

/**
 * Get current customer info (entitlements, subscriptions).
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isConfigured) return null;
  return Purchases.getCustomerInfo();
}

/**
 * Check if the user has an active entitlement.
 */
export async function hasEntitlement(
  entitlementId: string
): Promise<boolean> {
  const info = await getCustomerInfo();
  if (!info) return false;
  return entitlementId in info.entitlements.active;
}

/**
 * Purchase a package by ID from the current offerings.
 */
export async function purchasePackage(
  packageId: string
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  if (!isConfigured) {
    return { success: false, error: "RevenueCat not configured" };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const allPackages = offerings.current?.availablePackages ?? [];
    const pkg = allPackages.find(
      (p: PurchasesPackage) => p.identifier === packageId
    );

    if (!pkg) {
      return { success: false, error: `Package not found: ${packageId}` };
    }

    const result = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo: result.customerInfo };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Purchase failed";
    // RevenueCat throws a specific error when the user cancels.
    const isCancelled =
      err && typeof err === "object" && "userCancelled" in err && (err as { userCancelled: boolean }).userCancelled;
    if (isCancelled) {
      return { success: false, error: "cancelled" };
    }
    return { success: false, error: message };
  }
}

/**
 * Restore purchases (e.g., after reinstall or new device).
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  if (!isConfigured) {
    return { success: false, error: "RevenueCat not configured" };
  }

  try {
    const info = await Purchases.restorePurchases();
    return { success: true, customerInfo: info };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Restore failed",
    };
  }
}
