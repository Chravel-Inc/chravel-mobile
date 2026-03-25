import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

import {
  isBiometricAvailable,
  getBiometricType,
  authenticate,
  type BiometricType,
} from "./src/biometrics";
import { LockScreen } from "./src/LockScreen";
import { ErrorScreen } from "./src/ErrorScreen";
import { ChravelWebView } from "./src/ChravelWebView";
import { PushPrePrompt } from "./src/PushPrePrompt";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isLocked, setIsLocked] = useState(true);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>("none");
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean | null>(null);
  const appState = useRef(AppState.currentState);

  // Check biometric availability and auto-prompt on mount.
  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      setBiometricsAvailable(available);

      if (available) {
        const type = await getBiometricType();
        setBiometricType(type);
        const success = await authenticate();
        if (success) {
          setIsLocked(false);
          setShowPushPrompt(true);
        }
      } else {
        setIsLocked(false);
        setShowPushPrompt(true);
      }

      await SplashScreen.hideAsync();
    })();
  }, []);

  // Re-lock when app returns from background.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === "active" &&
          biometricsAvailable
        ) {
          setIsLocked(true);
          const success = await authenticate();
          if (success) {
            setIsLocked(false);
          }
        }
        appState.current = nextState;
      }
    );

    return () => subscription.remove();
  }, [biometricsAvailable]);

  const handleUnlock = useCallback(async () => {
    const success = await authenticate();
    if (success) {
      setIsLocked(false);
    }
  }, []);

  // Still checking biometric availability — splash is visible.
  if (biometricsAvailable === null) {
    return null;
  }

  // Lock screen.
  if (isLocked && biometricsAvailable) {
    return (
      <SafeAreaProvider>
        <LockScreen biometricType={biometricType} onUnlock={handleUnlock} />
      </SafeAreaProvider>
    );
  }

  // Push notification pre-prompt (once after first login).
  if (showPushPrompt) {
    return (
      <SafeAreaProvider>
        <PushPrePrompt onComplete={() => setShowPushPrompt(false)} />
      </SafeAreaProvider>
    );
  }

  // Error / offline screen.
  if (hasError) {
    return (
      <SafeAreaProvider>
        <ErrorScreen onRetry={() => setHasError(false)} />
      </SafeAreaProvider>
    );
  }

  // Main app.
  return (
    <SafeAreaProvider>
      <ChravelWebView onError={() => setHasError(true)} />
    </SafeAreaProvider>
  );
}
