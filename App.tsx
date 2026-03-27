import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

import { ErrorScreen } from "./src/ErrorScreen";
import { ChravelWebView } from "./src/ChravelWebView";
import { PushPrePrompt } from "./src/PushPrePrompt";
import { LockScreen } from "./src/LockScreen";
import {
  isBiometricAvailable,
  getBiometricType,
  authenticate,
  type BiometricType,
} from "./src/biometrics";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [locked, setLocked] = useState(true);
  const [biometricType, setBiometricType] = useState<BiometricType | null>(null);
  const [biometricsChecked, setBiometricsChecked] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(true);
  const [hasError, setHasError] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  const promptBiometric = useCallback(async () => {
    const success = await authenticate();
    if (success) setLocked(false);
  }, []);

  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      if (available) {
        const type = await getBiometricType();
        setBiometricType(type);
        setBiometricsChecked(true);
        SplashScreen.hideAsync();
        const success = await authenticate();
        if (success) setLocked(false);
      } else {
        setLocked(false);
        setBiometricsChecked(true);
        SplashScreen.hideAsync();
      }
    })();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appStateRef.current.match(/background/) &&
        nextState === "active" &&
        biometricType
      ) {
        setLocked(true);
        authenticate().then((success) => {
          if (success) setLocked(false);
        });
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [biometricType]);

  if (!biometricsChecked) return null;

  if (locked && biometricType) {
    return (
      <SafeAreaProvider>
        <LockScreen biometricType={biometricType} onUnlock={promptBiometric} />
      </SafeAreaProvider>
    );
  }

  if (showPushPrompt) {
    return (
      <SafeAreaProvider>
        <PushPrePrompt onComplete={() => setShowPushPrompt(false)} />
      </SafeAreaProvider>
    );
  }

  if (hasError) {
    return (
      <SafeAreaProvider>
        <ErrorScreen onRetry={() => setHasError(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ChravelWebView onError={() => setHasError(true)} />
    </SafeAreaProvider>
  );
}
