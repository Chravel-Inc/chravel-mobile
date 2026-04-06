const mockPurchases = {
  getOfferings: jest.fn(),
  purchasePackage: jest.fn(),
  logIn: jest.fn(),
  configure: jest.fn(),
  setLogLevel: jest.fn(),
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

describe("revenuecat", () => {
  // Re-import the module fresh for each test to reset isConfigured/packagesCache.
  let configureRevenueCat: typeof import("../revenuecat").configureRevenueCat;
  let identifyUser: typeof import("../revenuecat").identifyUser;
  let purchasePackage: typeof import("../revenuecat").purchasePackage;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    const mod = require("../revenuecat");
    configureRevenueCat = mod.configureRevenueCat;
    identifyUser = mod.identifyUser;
    purchasePackage = mod.purchasePackage;
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

    await configureRevenueCat();
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

    await configureRevenueCat();
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

    await configureRevenueCat();
    const result = await purchasePackage("non-existent");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Package not found");
  });
});
