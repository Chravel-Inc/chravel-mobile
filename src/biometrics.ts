import * as LocalAuthentication from "expo-local-authentication";

export type BiometricType = "faceid" | "fingerprint" | "iris" | "none";

/**
 * Check if any biometric authentication is available on the device.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/**
 * Get the type of biometric authentication available.
 */
export async function getBiometricType(): Promise<BiometricType> {
  const types =
    await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (
    types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    )
  ) {
    return "faceid";
  }
  if (
    types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
  ) {
    return "fingerprint";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return "iris";
  }
  return "none";
}

/**
 * Get a user-friendly label for the biometric type.
 */
export function getBiometricLabel(type: BiometricType): string {
  switch (type) {
    case "faceid":
      return "Face ID";
    case "fingerprint":
      return "Touch ID";
    case "iris":
      return "Iris";
    default:
      return "Biometrics";
  }
}

/**
 * Prompt for biometric authentication.
 * Returns true if authenticated, false if cancelled or failed.
 */
export async function authenticate(
  promptMessage?: string
): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: promptMessage ?? "Unlock Chravel",
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
    fallbackLabel: "Use Passcode",
  });

  return result.success;
}
