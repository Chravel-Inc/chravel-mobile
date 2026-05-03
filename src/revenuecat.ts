import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { ENTITLEMENTS } from "./constants";

let isConfigured = false;
let packagesCache: Map<string, PurchasesPackage> | null = null;
/** Coalesces concurrent configure + ensures identify/purchase await the same init. */
let configurePromise: Promise<void> | null = null;

/**
 * Initialize RevenueCat. Call once on app startup.
 * No-ops if API key is missing (allows dev builds without keys).
 * Safe to await from the bridge before identify/purchase: overlapping calls share one init.
 */
export async function configureRevenueCat(): Promise<void> {
  if (isConfigured) return;
  if (!configurePromise) {
    configurePromise = (async () => {
      const apiKey =
        Platform.OS === "ios"
          ? Constants.expoConfig?.extra?.revenueCatIosApiKey
          : Constants.expoConfig?.extra?.revenueCatAndroidApiKey;

      if (!apiKey) {
        return;
      }

      Purchases.configure({ apiKey });

      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      isConfigured = true;
    })();
  }
  await configurePromise;
}

/**
 * Internal helper to fetch current available packages and cache them.
 */
async function getCachedPackages(): Promise<Map<string, PurchasesPackage>> {
  if (packagesCache) return packagesCache;

  const offerings = await Purchases.getOfferings();
  const allPackages = offerings.current?.availablePackages ?? [];
  const map = new Map<string, PurchasesPackage>(
    allPackages.map((p) => [p.identifier, p])
  );

  packagesCache = map;
  return map;
}

/**
 * Identify the RevenueCat user (call after Supabase auth resolves).
 * The web app sends the Supabase user ID via the bridge.
 */
export async function identifyUser(userId: string): Promise<void> {
  await configureRevenueCat();
  if (!isConfigured) return;
  packagesCache = null;
  await Purchases.logIn(userId);
}

/**
 * Get current customer info (entitlements, subscriptions).
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  await configureRevenueCat();
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
  await configureRevenueCat();
  if (!isConfigured) {
    return { success: false, error: "RevenueCat not configured" };
  }

  try {
    const packagesMap = await getCachedPackages();
    const pkg = packagesMap.get(packageId);

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
  await configureRevenueCat();
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
