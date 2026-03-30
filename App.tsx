import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

import { ErrorScreen } from "./src/ErrorScreen";
import { ChravelWebView } from "./src/ChravelWebView";
import { PushPrePrompt } from "./src/PushPrePrompt";
import { TermsAgreement } from "./src/TermsAgreement";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [showTerms, setShowTerms] = useState(true);
  const [showPushPrompt, setShowPushPrompt] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

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
      <View style={styles.container}>{content}</View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
