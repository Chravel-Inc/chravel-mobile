import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";

const mockPurchases = {
  getOfferings: jest.fn(),
  purchasePackage: jest.fn(),
  logIn: jest.fn(),
  configure: jest.fn(),
};

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: mockPurchases,
  LOG_LEVEL: { DEBUG: 0 },
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      revenueCatIosApiKey: "ios-api-key",
    },
  },
}));

import { configureRevenueCat, identifyUser, purchasePackage } from "../revenuecat";

describe("revenuecat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the internal state of the module by re-importing or manually resetting
    // Since we can't easily reset module-level variables without more complex setup,
    // we'll just ensure we understand the state.
  });

  it("should purchase a package successfully", async () => {
    const mockPackage = { identifier: "pkg_1" };
    mockPurchases.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [mockPackage],
      },
    });
    mockPurchases.purchasePackage.mockResolvedValue({
      customerInfo: { entitlements: { active: {} } },
    });

    await configureRevenueCat();
    const result = await purchasePackage("pkg_1");

    expect(result.success).toBe(true);
    expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(1);
    expect(mockPurchases.purchasePackage).toHaveBeenCalledWith(mockPackage);
  });

  it("should use the cache for subsequent purchases", async () => {
    const mockPackage = { identifier: "pkg_1" };
    mockPurchases.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [mockPackage],
      },
    });

    // Invalidate cache first by identifying user
    await identifyUser("reset");
    mockPurchases.getOfferings.mockClear();

    await purchasePackage("pkg_1");
    await purchasePackage("pkg_1");

    expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(1);
  });

  it("should invalidate the cache when user is identified", async () => {
    const mockPackage = { identifier: "pkg_1" };
    mockPurchases.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [mockPackage],
      },
    });

    await identifyUser("user-1");
    await purchasePackage("pkg_1");
    expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(1);

    await identifyUser("user-2");
    await purchasePackage("pkg_1");

    expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(2);
  });

  it("should return error if package not found", async () => {
    mockPurchases.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [],
      },
    });

    await identifyUser("reset-not-found");
    const result = await purchasePackage("non-existent");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Package not found");
  });
});
