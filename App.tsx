import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

import { ErrorScreen } from "./src/ErrorScreen";
import { ChravelWebView } from "./src/ChravelWebView";
import { PushPrePrompt } from "./src/PushPrePrompt";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [showPushPrompt, setShowPushPrompt] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Push notification pre-prompt (once after first launch).
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
