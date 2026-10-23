import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTanGeneration } from "../hooks/use-tan-generation";
import { useTanSession } from "../state/tan-session";

const PROCESSING_MESSAGES = [
  "Finding exposed skin…",
  "Creating your tan…",
  "Keeping everything else untouched…",
  "Finishing the details…",
] as const;

export default function ProcessingScreen() {
  const router = useRouter();
  const { generation, originalPhoto } = useTanSession();
  const { generate } = useTanGeneration();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((current) => Math.min(current + 1, PROCESSING_MESSAGES.length - 1));
    }, 3_000);

    return () => clearInterval(interval);
  }, []);

  if (originalPhoto === null) {
    return <Redirect href="/" />;
  }

  if (generation.status === "success") {
    return <Redirect href="/result" />;
  }

  if (generation.status === "idle") {
    return <Redirect href="/editor" />;
  }

  const hasError = generation.status === "error";

  return (
    <View style={styles.background}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.headingBlock}>
          <Text style={styles.eyebrow}>SOLYNE AI</Text>
          <Text style={styles.heading}>{hasError ? "We couldn't finish" : "Creating your look"}</Text>
          <Text style={styles.helper}>
            {hasError ? "Your original photo is safe and ready to retry." : "This usually takes a few moments."}
          </Text>
        </View>

        <View style={styles.imageFrame}>
          <Image
            accessibilityLabel="Original photo while tan is processing"
            blurRadius={1.5}
            resizeMode="contain"
            source={{ uri: originalPhoto.uri }}
            style={styles.image}
          />
          {!hasError && (
            <View style={styles.overlay}>
              <ActivityIndicator color="#FFFDFC" size="large" />
            </View>
          )}
        </View>

        {generation.status === "error" ? (
          <View style={styles.errorBlock}>
            <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
              {generation.error.message}
            </Text>
            {generation.error.requestId && (
              <Text style={styles.reference}>Reference: {generation.error.requestId}</Text>
            )}
            <View style={styles.errorActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void generate(generation.preset, "none")}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace("/editor")}
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              >
                <Text style={styles.backButtonText}>Back to presets</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Text accessibilityLiveRegion="polite" style={styles.statusText}>
              {PROCESSING_MESSAGES[messageIndex]}
            </Text>
            <Text style={styles.detail}>Your original photo stays untouched.</Text>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: "#241813", flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 22, paddingVertical: 18 },
  headingBlock: { marginBottom: 22, marginTop: 16 },
  eyebrow: {
    color: "#D6A786",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  heading: { color: "#FFFDFC", fontSize: 30, fontWeight: "600", letterSpacing: -0.8 },
  helper: { color: "#C9BDB5", fontSize: 15, marginTop: 8 },
  imageFrame: {
    backgroundColor: "#3A2A23",
    borderRadius: 24,
    flex: 1,
    maxHeight: 590,
    overflow: "hidden",
  },
  image: { height: "100%", opacity: 0.78, width: "100%" },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(36, 24, 19, 0.2)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  statusText: {
    color: "#FFFDFC",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 24,
    textAlign: "center",
  },
  detail: { color: "#AE9F97", fontSize: 13, marginBottom: 8, marginTop: 8, textAlign: "center" },
  errorBlock: { marginTop: 18 },
  errorText: { color: "#FFFDFC", fontSize: 16, lineHeight: 22, textAlign: "center" },
  reference: { color: "#AE9F97", fontSize: 11, marginTop: 6, textAlign: "center" },
  errorActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#FFFDFC",
    borderRadius: 15,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  retryButtonText: { color: "#2A1A14", fontSize: 15, fontWeight: "700" },
  backButton: {
    alignItems: "center",
    borderColor: "#78675E",
    borderRadius: 15,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  backButtonText: { color: "#FFFDFC", fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.7 },
});
