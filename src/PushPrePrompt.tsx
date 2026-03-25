/**
 * Push Notification Pre-Prompt Screen
 *
 * Shown once after first login to explain the value of notifications
 * before triggering the OS permission prompt. Apple recommends this
 * pattern — apps that prompt without context get lower opt-in rates
 * and risk App Store rejection.
 *
 * Uses AsyncStorage to track whether it's been shown.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const STORAGE_KEY = "chravel:push-preprompt-shown";

interface PushPrePromptProps {
  onComplete: () => void;
}

export function PushPrePrompt({ onComplete }: PushPrePromptProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    (async () => {
      // Check if already shown.
      const shown = await AsyncStorage.getItem(STORAGE_KEY);
      if (shown === "true") {
        onComplete();
        return;
      }

      // Check if permission already granted (returning user on new install).
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") {
        await AsyncStorage.setItem(STORAGE_KEY, "true");
        onComplete();
        return;
      }

      setIsVisible(true);
    })();
  }, [onComplete]);

  const handleEnable = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "true");
    await Notifications.requestPermissionsAsync();

    // Android needs a notification channel.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#3A60D0",
      });
    }

    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "true");
    onComplete();
  }, [onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🔔</Text>
        <Text style={styles.title}>Stay in the Loop</Text>
        <Text style={styles.body}>
          Get notified when your group chat has new messages, trip plans change,
          or someone shares a photo.
        </Text>

        <View style={styles.features}>
          <Text style={styles.feature}>💬  New chat messages</Text>
          <Text style={styles.feature}>📅  Trip plan updates</Text>
          <Text style={styles.feature}>📸  Shared photos & media</Text>
          <Text style={styles.feature}>💰  Expense split requests</Text>
        </View>

        <TouchableOpacity style={styles.enableButton} onPress={handleEnable}>
          <Text style={styles.enableText}>Enable Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#191817",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 56,
    marginBottom: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    color: "#999999",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 32,
  },
  features: {
    alignSelf: "stretch",
    marginBottom: 40,
    gap: 12,
  },
  feature: {
    color: "#CCCCCC",
    fontSize: 15,
    lineHeight: 22,
  },
  enableButton: {
    backgroundColor: "#3A60D0",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 250,
    alignItems: "center",
    marginBottom: 16,
  },
  enableText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipText: {
    color: "#666666",
    fontSize: 15,
  },
});
