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

import { TERMS_URL, PRIVACY_URL, COLORS } from "./constants";

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

  const toggleAgreed = useCallback(() => {
    setAgreed((prev) => !prev);
  }, []);

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

        <View style={styles.checkboxRow}>
          <TouchableOpacity onPress={toggleAgreed} activeOpacity={0.7}>
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
          <View style={styles.checkboxLabelRow}>
            <TouchableOpacity onPress={toggleAgreed} activeOpacity={0.7}>
              <Text style={styles.checkboxLabel}>I agree to the Chravel </Text>
            </TouchableOpacity>
            <Text
              style={[styles.checkboxLabel, styles.link]}
              onPress={() => Linking.openURL(TERMS_URL)}
            >
              Terms of Use
            </Text>
            <TouchableOpacity onPress={toggleAgreed} activeOpacity={0.7}>
              <Text style={styles.checkboxLabel}> and </Text>
            </TouchableOpacity>
            <Text
              style={[styles.checkboxLabel, styles.link]}
              onPress={() => Linking.openURL(PRIVACY_URL)}
            >
              Privacy Policy
            </Text>
          </View>
        </View>

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
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.brandBlue,
    borderColor: COLORS.brandBlue,
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
  },
  checkboxLabelRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  link: {
    color: COLORS.brandBlue,
    textDecorationLine: "underline",
  },
  continueButton: {
    backgroundColor: COLORS.brandBlue,
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
