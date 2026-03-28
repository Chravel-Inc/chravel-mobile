/**
 * Terms & Privacy Agreement Screen
 *
 * Shown once before the signup WebView to require explicit consent
 * to Terms of Use and Privacy Policy. This is an App Store requirement
 * for apps that create user accounts.
 *
 * Uses AsyncStorage so returning users are never prompted again.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { TERMS_URL, PRIVACY_URL } from "./constants";

const STORAGE_KEY = "chravel:terms-agreed";

interface TermsAgreementProps {
  onComplete: () => void;
}

export function TermsAgreement({ onComplete }: TermsAgreementProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    (async () => {
      const accepted = await AsyncStorage.getItem(STORAGE_KEY);
      if (accepted === "true") {
        onComplete();
        return;
      }
      setIsVisible(true);
    })();
  }, [onComplete]);

  const handleContinue = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "true");
    onComplete();
  }, [onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Chravel</Text>
        <Text style={styles.body}>
          Before creating your account, please review and agree to our terms.
        </Text>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAgreed((prev) => !prev)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            I agree to the Chravel{" "}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL(TERMS_URL)}
            >
              Terms of Use
            </Text>{" "}
            and{" "}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL(PRIVACY_URL)}
            >
              Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueButton, !agreed && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!agreed}
        >
          <Text
            style={[styles.continueText, !agreed && styles.continueTextDisabled]}
          >
            Continue
          </Text>
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
    marginBottom: 40,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    alignSelf: "stretch",
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#555555",
    marginRight: 12,
    marginTop: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#3A60D0",
    borderColor: "#3A60D0",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  checkboxLabel: {
    color: "#CCCCCC",
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  link: {
    color: "#3A60D0",
    textDecorationLine: "underline",
  },
  continueButton: {
    backgroundColor: "#3A60D0",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 250,
    alignItems: "center",
  },
  continueButtonDisabled: {
    backgroundColor: "#2A2A2A",
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  continueTextDisabled: {
    color: "#555555",
  },
});
