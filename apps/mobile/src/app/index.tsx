import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoldenHourDemo } from "../components/golden-hour-demo";
import { palette as c, editorialFont } from "../design/theme";
import { hasPaidAccess } from "../services/billing";

import {
  choosePhotoFromLibrary,
  takePhotoWithCamera,
  type PhotoSelectionResult,
} from "../services/photo-selection";
import { useTanSession } from "../state/tan-session";

type ActiveAction = "camera" | "library" | null;

function showPermissionAlert(result: Extract<PhotoSelectionResult, { status: "permission-denied" }>) {
  const sourceLabel = result.source === "camera" ? "Camera" : "Photo library";

  if (result.canAskAgain) {
    Alert.alert(
      `${sourceLabel} access needed`,
      `Solyne needs ${sourceLabel.toLowerCase()} access only when you choose this action. You can try again when you're ready.`,
    );
    return;
  }

  Alert.alert(
    `${sourceLabel} access is off`,
    `Enable ${sourceLabel.toLowerCase()} access in Settings to continue.`,
    [
      { text: "Not now", style: "cancel" },
      { text: "Open Settings", onPress: () => void Linking.openSettings() },
    ],
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { clearSession, originalPhoto, setOriginalPhoto } = useTanSession();
  const selectionLock = useRef(false);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

  async function selectPhoto(source: Exclude<ActiveAction, null>) {
    if (selectionLock.current) {
      return;
    }

    selectionLock.current = true;
    setActiveAction(source);

    try {
      const result =
        source === "camera" ? await takePhotoWithCamera() : await choosePhotoFromLibrary();

      if (result.status === "selected") {
        setOriginalPhoto(result.photo);
        router.push(hasPaidAccess() ? "/editor" : "/paywall");
      } else if (result.status === "permission-denied") {
        showPermissionAlert(result);
      }
    } catch {
      Alert.alert(
        "Photo unavailable",
        "Solyne couldn't prepare that photo. Please choose another image and try again.",
      );
    } finally {
      selectionLock.current = false;
      setActiveAction(null);
    }
  }

  return (
    <SafeAreaView style={styles.background}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.nav}>
          <Text style={styles.wordmark}>solyne<Text style={styles.wordmarkDot}>.</Text></Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/paywall")} style={styles.membership}><Text style={styles.membershipText}>Discover Plus ↗</Text></Pressable>
        </View>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>A LITTLE SUN, WHEREVER YOU ARE</Text>
          <Text style={styles.title}>{"Your golden\nhour, anytime."}</Text>
          <Text style={styles.description}>A natural-looking tan. The same beautiful you.</Text>
        </View>
        <GoldenHourDemo />
        <View style={styles.steps}>
          {["01  Choose a photo", "02  Find your glow", "03  Make it yours"].map((step) => <Text key={step} style={styles.step}>{step}</Text>)}
        </View>
        {originalPhoto && <View style={styles.resumeCard}>
          <Image source={{ uri: originalPhoto.uri }} style={styles.resumePhoto} accessibilityLabel="Your selected original photo" />
          <View style={styles.resumeCopy}><Text style={styles.resumeTitle}>Your photo is ready</Text><Text style={styles.resumeDetail}>Pick up where you left off.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Clear selected photo and start over" disabled={activeAction !== null} onPress={clearSession} style={styles.clearPhoto}><Text style={styles.clearPhotoText}>×</Text></Pressable>
        </View>}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={activeAction !== null} onPress={() => originalPhoto ? router.push(hasPaidAccess() ? "/editor" : "/paywall") : void selectPhoto("library")} style={({ pressed }) => [styles.primaryButton, (pressed || activeAction !== null) && styles.buttonPressed]} testID="choose-photo-button">
            <Text style={styles.primaryButtonText}>{activeAction === "library" ? "Preparing photo…" : originalPhoto ? "Continue with my photo  ↗" : "Find my glow  ↗"}</Text>
          </Pressable>
          <Text style={styles.helper}>{originalPhoto ? "Membership required to edit & save" : "Choose a photo · Membership required to edit & save"}</Text>
          <View style={styles.secondaryActions}>
            {originalPhoto && <Pressable accessibilityRole="button" disabled={activeAction !== null} onPress={() => void selectPhoto("library")} style={styles.secondaryButton} testID="choose-another-photo-button"><Text style={styles.secondaryButtonText}>Choose another</Text></Pressable>}
            <Pressable accessibilityRole="button" disabled={activeAction !== null} onPress={() => void selectPhoto("camera")} style={styles.secondaryButton} testID="take-photo-button"><Text style={styles.secondaryButtonText}>{activeAction === "camera" ? "Opening camera…" : "Take a photo"}</Text></Pressable>
            <Text style={styles.divider}>·</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push(hasPaidAccess() ? "/library" : "/paywall")} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>My edits</Text></Pressable>
          </View>
        </View>
        <View style={styles.secondaryActions}>
          {([ ["privacy", "Privacy"], ["terms", "Terms"], ["support", "Support"] ] as const).map(([document, title]) => <Pressable key={document} accessibilityRole="link" onPress={() => router.push({ pathname: "/legal", params: { document } })} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{title}</Text></Pressable>)}
        </View>
        <View style={styles.note}><Text style={styles.noteIcon}>✳</Text><Text style={styles.noteText}>Your kind of golden. Adjust the intensity and refine the details after you join Plus.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: c.paper },
  content: { width: "100%", maxWidth: 490, alignSelf: "center", paddingHorizontal: 24, paddingTop: 10, paddingBottom: 28, gap: 23 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, wordmark: { fontFamily: editorialFont, fontSize: 37, color: c.ink, letterSpacing: -2 }, wordmarkDot: { color: c.gold }, membership: { borderWidth: 1, borderColor: c.line, borderRadius: 22, minHeight: 44, justifyContent: "center", paddingHorizontal: 15 }, membershipText: { color: c.olive, fontSize: 11, fontWeight: "600" },
  heading: { alignItems: "center", gap: 12 }, eyebrow: { color: c.olive, fontSize: 9, fontWeight: "700", letterSpacing: 1.8, textAlign: "center" }, title: { fontFamily: editorialFont, color: c.ink, fontSize: 51, lineHeight: 54, letterSpacing: -2, textAlign: "center" }, description: { color: c.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  resumeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1, borderColor: c.line, borderRadius: 18, backgroundColor: c.cream }, resumePhoto: { width: 48, height: 60, borderRadius: 10 }, resumeCopy: { flex: 1, gap: 5 }, resumeTitle: { color: c.ink, fontSize: 14, fontWeight: "600" }, resumeDetail: { color: c.muted, fontSize: 12 }, clearPhoto: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, clearPhotoText: { color: c.muted, fontSize: 24 },
  steps: { flexDirection: "row", justifyContent: "space-between", gap: 5 }, step: { color: c.muted, fontSize: 10 }, actions: { gap: 10 }, primaryButton: { alignItems: "center", backgroundColor: c.olive, borderRadius: 30, minHeight: 60, justifyContent: "center", paddingHorizontal: 22 }, primaryButtonText: { color: c.white, fontSize: 17, fontWeight: "600" }, helper: { color: c.muted, fontSize: 10, lineHeight: 16, textAlign: "center" }, secondaryActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12 }, secondaryButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12 }, secondaryButtonText: { color: c.olive, fontSize: 13, fontWeight: "500" }, divider: { color: c.muted }, buttonPressed: { opacity: 0.7 }, note: { borderTopWidth: 1, borderColor: c.line, paddingTop: 18, flexDirection: "row", alignItems: "center", gap: 12 }, noteIcon: { fontSize: 28, color: c.gold }, noteText: { flex: 1, color: c.muted, fontSize: 11, lineHeight: 17 },
});
