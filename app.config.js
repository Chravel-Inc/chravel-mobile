const fs = require('fs');

const IS_PROD = process.env.EAS_BUILD_PROFILE === 'production';

// Fail the build if required variables are missing in production.
if (IS_PROD) {
  if (!process.env.REVENUECAT_IOS_API_KEY) {
    throw new Error("Build Failed: Missing REVENUECAT_IOS_API_KEY environment variable.");
  }
  if (!process.env.REVENUECAT_ANDROID_API_KEY) {
    throw new Error("Build Failed: Missing REVENUECAT_ANDROID_API_KEY environment variable.");
  }
  // Android push configuration missing check
  if (!fs.existsSync('./google-services.json') && !process.env.GOOGLE_SERVICES_JSON) {
    throw new Error("Build Failed: google-services.json is missing. Android push notifications will fail.");
  }
}

module.exports = ({ config }) => ({h
    ...config,
        name: "Chravel",
        slug: "chravel-mobile",
        owner: "play-store-project"
        version: "1.0.0",
        orientation: "default",
        icon: "./assets/icon.png",
        userInterfaceStyle: "automatic",
        scheme: "chravel",
        // @ts-ignore
        newArchEnabled: true,
        splash: {
    image: "./assets/splash.png",
          resizeMode: "contain",
          backgroundColor: "#0b0b0f",
      },
        assetBundlePatterns: ["**/*"],
            ios: {
    supportsTablet: true,
          bundleIdentifier: "com.chravel.app",
          buildNumber: "1",
          infoPlist: {
      NSCameraUsageDescription: "Chravel uses the camera to capture photos and videos you choose to share with your trips.",
              NSPhotoLibraryUsageDescription: "Chravel needs access to your photo library so you can upload photos and videos to trip chats and shared albums.",
              NSPhotoLibraryAddUsageDescription: "Chravel needs permission to save trip photos and videos to your library when you choose to download media.",
              NSLocationWhenInUseUsageDescription: "Chravel uses your location (only while you're using the app) for optional location sharing and to help coordinate meetups during a trip.",
              NSMicrophoneUsageDescription: "Chravel uses your microphone for AI Concierge voice conversations when you tap the mic.",
              NSSpeechRecognitionUsageDescription: "Chravel uses speech recognition to transcribe your voice input for AI Concierge and chat dictation.",
              ITSAppUsesNonExemptEncryption: false,
        },
            associatedDomains: ["applinks:chravel.app", "applinks:www.chravel.app", "webcredentials:chravel.app"],
            entitlements: {
      "aps-environment": "production",
              "com.apple.developer.applesignin": ["Default"],
        },
            privacyManifests: {
      NSPrivacyTracking: false,
              NSPrivacyTrackingDomains: [],
              NSPrivacyCollectedDataTypes: [
        {
                  NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeEmailAddress",
                              NSPrivacyCollectedDataTypeLinked: true,
                              NSPrivacyCollectedDataTypeTracking: false,
                              NSPrivacyCollectedDataTypePurposes: [
                                "NSPrivacyCollectedDataTypePurposeAppFunctionality",
                                "NSPrivacyCollectedDataTypePurposeProductPersonalization",
                              ],
                    },
                    {
                              NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeName",
                              NSPrivacyCollectedDataTypeLinked: true,
                              NSPrivacyCollectedDataTypeTracking: false,
                              NSPrivacyCollectedDataTypePurposes: [
                                "NSPrivacyCollectedDataTypePurposeAppFunctionality",
                              ],
                    },
                    {
                              NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePhoneNumber",
                                          NSPrivacyCollectedDataTypeLinked: true,
                                          NSPrivacyCollectedDataTypeTracking: false,
                                          NSPrivacyCollectedDataTypePurposes: [
                                            "NSPrivacyCollectedDataTypePurposeAppFunctionality",
                                          ],
                                },
                                {
                                          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePhotosOrVideos",
                                                      NSPrivacyCollectedDataTypeLinked: true,
                                                      NSPrivacyCollectedDataTypeTracking: false,
                                                      NSPrivacyCollectedDataTypePurposes: [
                                                        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
                                                      ],
                                            },
                                            {
                                                      NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePreciseLocation",
                                                                  NSPrivacyCollectedDataTypeLinked: true,
                                                                  NSPrivacyCollectedDataTypeTracking: false,
                                                                  NSPrivacyCollectedDataTypePurposes: [
                                                                    "NSPrivacyCollectedDataTypePurposeAppFunctionality",
                                                                  ],
                                                        },
                                                        {
                                                                  NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeUserID",
                                                                              NSPrivacyCollectedDataTypeLinked: true,
                                                                              NSPrivacyCollectedDataTypeTracking: false,
                                                                              NSPrivacyCollectedDataTypePurposes: [
                                                                                "NSPrivacyCollectedDataTypePurposeAppFunctionality",
                                                                              ],
                                                                    },
                                                                    {
                                                                              NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeProductInteraction",
                                                                                          NSPrivacyCollectedDataTypeLinked: true,
                                                                                          NSPrivacyCollectedDataTypeTracking: false,
                                                                                          NSPrivacyCollectedDataTypePurposes: [
                                                                                            "NSPrivacyCollectedDataTypePurposeAnalytics",
                                                                                            "NSPrivacyCollectedDataTypePurposeProductPersonalization",
                                                                                          ],
                                                                                },
                                                                                {
                                                                                          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeCrashData",
                                                                                          NSPrivacyCollectedDataTypeLinked: true,
                                                                                          NSPrivacyCollectedDataTypeTracking: false,
                                                                                          NSPrivacyCollectedDataTypePurposes: [
                                                                                            "NSPrivacyCollectedDataTypePurposeAppFunctionality",
                                                                                          ],
                                                                                },
                                                                                {
                                                                                          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePurchaseHistory",
                                                                                                      NSPrivacyCollectedDataTypeLinked: true,
                                                                                                      NSPrivacyCollectedDataTypeTracking: false,
                                                                                                      NSPrivacyCollectedDataTypePurposes: [
                                                                                                        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
                                                                                                      ],
                                                                                            },
                                                                                                  ],
                                                                                                  NSPrivacyAccessedAPITypes: [
                                                                                            {
                                                                                                      NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
                                                                                                                  NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
                                                                                                        },
{
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
                      NSPrivacyAccessedAPITypeReasons: ["C617.1"],
            },
{
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
                      NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
            },
{
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
                      NSPrivacyAccessedAPITypeReasons: ["E174.1"],
            },
                  ],
            },
            },
              android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
              backgroundColor: "#191817",
        },
            package: "com.chravel.app",
                  versionCode: 1,
                  googleServicesFile: "./google-services.json",
                  permissions: [
                    "CAMERA",
                    "READ_EXTERNAL_STORAGE",
                    "WRITE_EXTERNAL_STORAGE",
                    "ACCESS_FINE_LOCATION",
                    "RECORD_AUDIO",
                    "VIBRATE",
                    "RECEIVE_BOOT_COMPLETED",
                  ],
                  intentFilters: [
              {
                      action: "VIEW",
                                autoVerify: true,
                                data: [
                        { scheme: "https", host: "chravel.app", pathPrefix: "/trip" },
{ scheme: "https", host: "chravel.app", pathPrefix: "/join" },
{ scheme: "https", host: "chravel.app", pathPrefix: "/invite" },
{ scheme: "https", host: "chravel.app", pathPrefix: "/tour" },
{ scheme: "https", host: "chravel.app", pathPrefix: "/event" },
{ scheme: "https", host: "chravel.app", pathPrefix: "/share" },
{ scheme: "https", host: "chravel.app", pathPrefix: "/profile" },
{ scheme: "https", host: "chravel.app", pathPrefix: "/organization" },
{ scheme: "https", host: "chravel.app", pathPrefix: "/auth-callback" },
{ scheme: "https", host: "chravel.app", pathPrefix: "/auth" },
{ scheme: "https", host: "chravel.app", pathPrefix: "/settings" },
{ scheme: "https", host: "www.chravel.app", pathPrefix: "/trip" },
{ scheme: "https", host: "www.chravel.app", pathPrefix: "/join" },
{ scheme: "https", host: "www.chravel.app", pathPrefix: "/invite" },
{ scheme: "https", host: "www.chravel.app", pathPrefix: "/tour" },
{ scheme: "https", host: "www.chravel.app", pathPrefix: "/event" },
{ scheme: "https", host: "www.chravel.app", pathPrefix: "/share" },
{ scheme: "https", host: "www.chravel.app", pathPrefix: "/profile" },
{ scheme: "https", host: "www.chravel.app", pathPrefix: "/organization" },
{ scheme: "https", host: "www.chravel.app", pathPrefix: "/auth-callback" },
{ scheme: "https", host: "www.chravel.app", pathPrefix: "/auth" },
{ scheme: "https", host: "www.chravel.app", pathPrefix: "/settings" },
          ],
          category: ["BROWSABLE", "DEFAULT"],
  },
{
        action: "VIEW",
                  data: [
          { scheme: "chravel", host: "auth-callback" }
        ],
        category: ["BROWSABLE", "DEFAULT"],
          }
              ],
          },
            plugins: [
              "expo-notifications",
              [
                "expo-audio",
          {
                  microphonePermission: "ChravelApp needs microphone access for voice conversations with AI Concierge",
                    },
              ],
              "@mykin-ai/expo-audio-stream",
              [
                "expo-splash-screen",
          {
                  image: "./assets/splash.png",
                            imageWidth: 420,
                            resizeMode: "contain",
                            backgroundColor: "#0b0b0f",
                            spinnerColor: "#c49746",
                            iosSpinnerStyle: "small",
                            androidSpinnerStyle: "small",
                    },
    ],
            ],
            extra: {
    eas: { projectId: "94c4e798-1f84-4e0c-9011-d18fe558f818" },
          webAppUrl: process.env.EXPO_PUBLIC_WEB_APP_URL || "https://chravel.app",
                revenueCatIosApiKey: process.env.REVENUECAT_IOS_API_KEY || "",
                revenueCatAndroidApiKey: process.env.REVENUECAT_ANDROID_API_KEY || "",
            },
});
