import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { COLORS, IS_TABLET, tabletScale } from "./constants";

interface ErrorScreenProps {
  onRetry: () => void;
}

export function ErrorScreen({ onRetry }: ErrorScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Can't reach Chravel</Text>
      <Text style={styles.body}>
        Check your internet connection and try again.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: tabletScale(32),
    maxWidth: IS_TABLET ? 540 : undefined,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    color: "#FFFFFF",
    fontSize: tabletScale(20),
    fontWeight: "600",
    marginBottom: 8,
  },
  body: {
    color: "#999999",
    fontSize: tabletScale(16),
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: COLORS.brandBlue,
    paddingHorizontal: tabletScale(32),
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: tabletScale(16),
    fontWeight: "600",
  },
});
