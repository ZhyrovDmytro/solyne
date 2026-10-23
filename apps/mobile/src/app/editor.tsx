import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { BackButton } from "../components/back-button";
import LiveTanEditor from "../components/live-tan-editor";
import { archiveEdit } from "../services/edit-library";
import { saveGeneratedPhoto } from "../services/result-saving";
import { photoDataUrl, saveLocalTanPreview } from "../services/local-tan";
import { useTanSession } from "../state/tan-session";

export default function EditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clearSession, originalPhoto } = useTanSession();
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (originalPhoto === null) return;

    photoDataUrl(originalPhoto)
      .then((dataUrl) => {
        if (!cancelled) setImageDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setErrorMessage("Solyne couldn't open this photo. Please choose it again.");
      });

    return () => {
      cancelled = true;
    };
  }, [originalPhoto]);

  const handleReady = useCallback(async () => {
    setErrorMessage(null);
  }, []);

  const handleError = useCallback(async (message: string) => {
    setErrorMessage(message);
  }, []);

  const handleExport = useCallback(async (
    dataUrl: string,
    intensity: number,
    durationMs: number,
  ) => {
    if (originalPhoto === null || exporting) return;
    setExporting(true);
    setSaveMessage(null);
    setErrorMessage(null);

    try {
      const result = await saveLocalTanPreview(dataUrl, intensity, durationMs);
      try {
        await archiveEdit(originalPhoto, result);
      } catch {
        // Keep the local result visible even if archiving is temporarily unavailable.
      }
      const outcome = await saveGeneratedPhoto(result.imageUrl);
      setSaveMessage(outcome.status === "saved"
        ? "Saved to Photos ✓"
        : "Allow Solyne to add photos in Settings, then try again.");
    } catch {
      setErrorMessage("Solyne couldn't prepare this result. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [exporting, originalPhoto]);

  if (originalPhoto === null) {
    return <Redirect href="/" />;
  }

  function changePhoto() {
    clearSession();
    router.dismissTo("/");
  }

  return (
    <View style={[styles.background, { paddingBottom: insets.bottom + 6 }]}>
      <View style={{ paddingTop: insets.top + 4 }}>
        <View style={styles.navigation}>
          <BackButton
            label={adjusting ? "Result" : "Home"}
            disabled={exporting}
            onPress={() => adjusting ? setAdjusting(false) : router.dismissTo("/")}
          />
          <Pressable
            accessibilityRole="button"
            disabled={exporting}
            onPress={changePhoto}
            style={({ pressed }) => [styles.changeButton, pressed && styles.pressed]}
          >
            <Text style={styles.changeButtonText}>New photo</Text>
          </Pressable>
        </View>
        {errorMessage !== null && (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            {errorMessage}
          </Text>
        )}

        {saveMessage !== null && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{saveMessage}</Text>}

      </View>

        {imageDataUrl === null ? (
          <View style={styles.loading}>
            <Image source={{ uri: originalPhoto.uri }} resizeMode="cover" style={styles.loadingPhoto} />
            <ActivityIndicator color="#A86D49" size="large" />
            <Text style={styles.loadingText}>Preparing your photo…</Text>
          </View>
        ) : (
          <View style={styles.editor}>
            <LiveTanEditor
              dom={{ scrollEnabled: false, contentInsetAdjustmentBehavior: "never", style: { flex: 1, backgroundColor: "#171411" } }}
              imageDataUrl={imageDataUrl}
              adjusting={adjusting}
              onAdjustingChange={async (value) => { setAdjusting(value); setSaveMessage(null); }}
              onError={handleError}
              onExport={handleExport}
              onReady={handleReady}
            />
            {exporting && (
              <View style={styles.exportOverlay}>
                <ActivityIndicator color="#FFFDFC" size="large" />
                <Text style={styles.exportText}>Preparing your result…</Text>
              </View>
            )}
          </View>
        )}
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: "#F7F1EB", flex: 1 },
  navigation: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 8 },
  changeButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 22, backgroundColor: "#FFFDFC", borderWidth: 1, borderColor: "#DED0C6" },
  changeButtonText: { color: "#3C2D26", fontSize: 14, fontWeight: "600" },
  editor: { flex: 1, marginHorizontal: 8, borderRadius: 24, overflow: "hidden" },
  loadingPhoto: { position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.6 },
  loading: { backgroundColor: "#171411", borderRadius: 24, overflow: "hidden", marginHorizontal: 8, alignItems: "center", flex: 1, justifyContent: "center", gap: 12 },
  loadingText: { color: "#F0E7E0", fontSize: 14, fontWeight: "600" },
  feedback: { color: "#FFFDFC", backgroundColor: "rgba(24,20,17,0.85)", borderRadius: 12, marginHorizontal: 20, padding: 12, fontSize: 13 },
  error: { backgroundColor: "#F5DEDA", color: "#8A332B", fontSize: 12, marginHorizontal: 20, padding: 12, borderRadius: 12 },
  exportOverlay: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", backgroundColor: "rgba(24, 20, 17, 0.76)", justifyContent: "center" },
  exportText: { color: "#FFFDFC", fontSize: 15, fontWeight: "600", marginTop: 10 },
  pressed: { opacity: 0.7 },
});
