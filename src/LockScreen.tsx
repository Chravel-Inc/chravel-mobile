import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { getBiometricLabel, type BiometricType } from "./biometrics";

interface LockScreenProps {
  biometricType: BiometricType;
  onUnlock: () => void;
}

export function LockScreen({ biometricType, onUnlock }: LockScreenProps) {
  const label = getBiometricLabel(biometricType);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.icon}>
          {biometricType === "faceid" ? "\u{1F510}" : "\u{1F513}"}
        </Text>
        <Text style={styles.title}>Chravel</Text>
        <Text style={styles.subtitle}>Unlock to access your trips</Text>
        <TouchableOpacity style={styles.button} onPress={onUnlock}>
          <Text style={styles.buttonText}>Unlock with {label}</Text>
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
    fontSize: 48,
    marginBottom: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#999999",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#3A60D0",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 220,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
