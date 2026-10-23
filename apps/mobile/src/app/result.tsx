import { Redirect, useRouter } from "expo-router";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TAN_PRESETS, type TanPreset } from "@solyne/shared";

import { BackButton } from "../components/back-button";
import { BeforeAfterSlider } from "../components/before-after-slider";
import { useTanGeneration } from "../hooks/use-tan-generation";
import { archiveEdit } from "../services/edit-library";
import { saveGeneratedPhoto } from "../services/result-saving";
import { useTanSession } from "../state/tan-session";

const PRESET_LABELS: Record<TanPreset, string> = {
  natural: "Natural",
  golden: "Golden",
  bronze: "Bronze",
  deep: "Deep",
};

export default function ResultScreen() {
  usePreventScreenCapture("solyne-result");

  const router = useRouter();
  const { completeGeneration, generation, originalPhoto } = useTanSession();
  const { generate, isGenerating } = useTanGeneration();
  const [nextPreset, setNextPreset] = useState<TanPreset>(
    generation.status === "success" ? generation.result.preset : "golden",
  );
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "permission-denied" | "error"
  >("idle");
  const [archiveBusy, setArchiveBusy] = useState(false);

  if (originalPhoto === null) {
    return <Redirect href="/" />;
  }

  if (generation.status === "generating" || generation.status === "error") {
    return <Redirect href="/processing" />;
  }

  if (generation.status === "idle") {
    return <Redirect href="/editor" />;
  }

  const { result } = generation;
  const isLocalResult = result.provider === "local-bodypix-preview" || result.provider === "local-mediapipe-skin";

  async function handleSave() {
    if (saveStatus === "saving") {
      return;
    }

    setSaveStatus("saving");
    try {
      const outcome = await saveGeneratedPhoto(result.imageUrl);
      setSaveStatus(outcome.status);
    } catch {
      setSaveStatus("error");
    }
  }

  async function retryArchive() {
    if (originalPhoto === null || archiveBusy) return;
    setArchiveBusy(true);
    try {
      const saved = await archiveEdit(originalPhoto, result);
      completeGeneration(result, saved);
    } catch {
      setArchiveBusy(false);
    }
  }

  return (
    <View style={styles.background}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.navigation}>
          <BackButton label="Home" disabled={saveStatus === "saving"} onPress={() => router.dismissTo("/")} />
        </View>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR RESULT</Text>
            <Text style={styles.heading}>{PRESET_LABELS[result.preset]} tan</Text>
          </View>
          <View style={styles.headerActions}>
            <Text style={styles.duration}>
              {isLocalResult
                ? `${Math.max(0.1, result.durationMs / 1_000).toFixed(1)}s selection`
                : `${Math.max(1, Math.round(result.durationMs / 1_000))}s`}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => router.push("/library")}>
              <Text style={styles.headerLink}>Your edits</Text>
            </Pressable>
          </View>
        </View>

        <BeforeAfterSlider
          afterUri={result.imageUrl}
          aspectRatio={originalPhoto.width / originalPhoto.height}
          beforeUri={originalPhoto.uri}
        />

        <Text style={styles.note}>
          {isLocalResult
            ? "Drag to compare. This preview was rendered locally from your original and cached skin mask."
            : "Drag the divider to compare your original and result."}
        </Text>
        {!result.imageUrl.startsWith("file://") && (
          <Pressable accessibilityRole="button" disabled={archiveBusy} onPress={() => void retryArchive()}>
            <Text style={styles.saveError}>
              {archiveBusy ? "Saving to your library…" : "Could not keep this edit on your phone. Tap to try saving it again."}
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={saveStatus === "saving"}
          onPress={() => void handleSave()}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        >
          <Text style={styles.saveButtonText}>
            {saveStatus === "saving"
              ? "Saving…"
              : saveStatus === "saved"
                ? "Saved to Photos ✓"
                : "Save to Photos"}
          </Text>
        </Pressable>
        {saveStatus === "permission-denied" && (
          <Text accessibilityLiveRegion="assertive" style={styles.saveError}>
            Allow Solyne to add photos in iPhone Settings, then try again.
          </Text>
        )}
        {saveStatus === "error" && (
          <Text accessibilityLiveRegion="assertive" style={styles.saveError}>
            The result could not be saved. Check your connection and try again.
          </Text>
        )}
        {!isLocalResult && (
          <>
            <Text style={styles.tryAnother}>Try another tan</Text>
            <View style={styles.presetRow}>
              {TAN_PRESETS.map((preset) => {
                const selected = preset === nextPreset;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={preset}
                    onPress={() => setNextPreset(preset)}
                    style={[styles.presetButton, selected && styles.presetButtonSelected]}
                  >
                    <Text style={[styles.presetText, selected && styles.presetTextSelected]}>
                      {PRESET_LABELS[preset]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={isGenerating}
              onPress={() => void generate(nextPreset, "replace")}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              <Text style={styles.buttonText}>Generate {PRESET_LABELS[nextPreset]}</Text>
            </Pressable>
          </>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/editor")}
          style={({ pressed }) => [styles.editorButton, pressed && styles.pressed]}
        >
          <Text style={styles.editorButtonText}>
            {isLocalResult ? "Adjust intensity" : "Back to editor"}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: "#F7F1EB", flex: 1 },
  safeArea: { flex: 1, paddingBottom: 16, paddingHorizontal: 18, paddingTop: 12 },
  navigation: { paddingBottom: 14 },
  header: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 16,
    paddingHorizontal: 4,
  },
  eyebrow: {
    color: "#9A6546",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  heading: { color: "#241813", fontSize: 28, fontWeight: "600", letterSpacing: -0.7 },
  headerActions: { alignItems: "flex-end", gap: 5 },
  headerLink: { color: "#87573C", fontSize: 13, fontWeight: "700" },
  duration: { color: "#88776E", fontSize: 13, fontWeight: "600" },
  note: { color: "#88776E", fontSize: 12, marginTop: 10, textAlign: "center" },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#A86D49",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 48,
  },
  saveButtonText: { color: "#FFFDFC", fontSize: 15, fontWeight: "700" },
  saveError: { color: "#A33F33", fontSize: 12, marginTop: 7, textAlign: "center" },
  tryAnother: { color: "#3C2D26", fontSize: 14, fontWeight: "700", marginTop: 12 },
  presetRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  presetButton: {
    alignItems: "center",
    backgroundColor: "#FFFDFC",
    borderColor: "#DCCBC0",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 3,
  },
  presetButtonSelected: { backgroundColor: "#A86D49", borderColor: "#A86D49" },
  presetText: { color: "#5E4A40", fontSize: 12, fontWeight: "600" },
  presetTextSelected: { color: "#FFFDFC" },
  button: {
    alignItems: "center",
    backgroundColor: "#2A1A14",
    borderRadius: 18,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 50,
  },
  buttonText: { color: "#FFFDFC", fontSize: 16, fontWeight: "700" },
  editorButton: { alignItems: "center", justifyContent: "center", minHeight: 40 },
  editorButtonText: { color: "#87573C", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.72 },
});
