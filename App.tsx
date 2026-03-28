import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

import { ErrorScreen } from "./src/ErrorScreen";
import { ChravelWebView } from "./src/ChravelWebView";
import { PushPrePrompt } from "./src/PushPrePrompt";
import { TermsAgreement } from "./src/TermsAgreement";
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
  const [showTerms, setShowTerms] = useState(true);
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
        appStateRef.current.match(/inactive|background/) &&
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

  let content;

  if (showTerms) {
    content = <TermsAgreement onComplete={() => setShowTerms(false)} />;
  } else if (showPushPrompt) {
    content = <PushPrePrompt onComplete={() => setShowPushPrompt(false)} />;
  } else if (hasError) {
    content = <ErrorScreen onRetry={() => setHasError(false)} />;
  } else {
    content = <ChravelWebView onError={() => setHasError(true)} />;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {content}
        {locked && biometricType && (
          <View style={styles.lockOverlay}>
            <LockScreen biometricType={biometricType} onUnlock={promptBiometric} />
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
