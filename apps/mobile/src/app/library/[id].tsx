import { useLocalSearchParams, useRouter } from "expo-router";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackButton } from "../../components/back-button";
import { BeforeAfterSlider } from "../../components/before-after-slider";
import { deleteSavedEdit, getSavedEdit, type SavedEdit } from "../../services/edit-library";
import { saveGeneratedPhoto } from "../../services/result-saving";

const LABELS = { natural: "Natural", golden: "Golden", bronze: "Bronze", deep: "Deep" };

export default function SavedEditScreen() {
  usePreventScreenCapture("solyne-saved-edit");
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [edit, setEdit] = useState<SavedEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getSavedEdit(id).then(
      (found) => { if (active) { setEdit(found); setLoading(false); } },
      () => { if (active) setLoading(false); },
    );
    return () => { active = false; };
  }, [id]);

  async function save() {
    if (edit === null || saving) return;
    setSaving(true);
    try {
      const outcome = await saveGeneratedPhoto(edit.afterUri);
      setMessage(outcome.status === "saved" ? "Saved to Photos" : "Allow Solyne to add photos in Settings, then try again.");
    } catch {
      setMessage("Could not save this photo. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (edit === null) return;
    Alert.alert("Delete this edit?", "The original and edited copy in Solyne will be removed from this phone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        void deleteSavedEdit(edit.id).then(() => router.dismissTo("/library"), () => setMessage("Could not delete this edit."));
      } },
    ]);
  }

  return (
    <View style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <BackButton label="Your edits" onPress={() => router.canGoBack() ? router.back() : router.dismissTo("/library")} />
        {edit === null ? (
          <Text style={styles.empty}>{loading ? "Loading edit…" : "This edit is no longer available."}</Text>
        ) : (
          <>
            <Text style={styles.title}>{LABELS[edit.preset]} tan</Text>
            <Text style={styles.date}>{new Date(edit.createdAt).toLocaleDateString()}</Text>
            <BeforeAfterSlider
              beforeUri={edit.beforeUri}
              afterUri={edit.afterUri}
              aspectRatio={edit.width / edit.height}
            />
            <Text style={styles.note}>Drag to compare before and after.</Text>
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={styles.saveButton}>
              <Text style={styles.saveText}>{saving ? "Saving…" : "Save to Photos again"}</Text>
            </Pressable>
            {message !== "" && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
            <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete this edit</Text>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: "#F7F1EB", flex: 1 },
  safeArea: { flex: 1, paddingBottom: 18, paddingHorizontal: 18, paddingTop: 12 },
  title: { marginTop: 18, color: "#241813", fontSize: 28, fontWeight: "600" },
  date: { color: "#88776E", fontSize: 13, marginBottom: 16, marginTop: 4 },
  empty: { color: "#7C6A60", fontSize: 16, paddingTop: 44, textAlign: "center" },
  note: { color: "#88776E", fontSize: 12, marginTop: 12, textAlign: "center" },
  saveButton: { alignItems: "center", backgroundColor: "#A86D49", borderRadius: 16, justifyContent: "center", marginTop: 18, minHeight: 52 },
  saveText: { color: "#FFFDFC", fontSize: 16, fontWeight: "700" },
  message: { color: "#5E4A40", fontSize: 13, marginTop: 12, textAlign: "center" },
  deleteButton: { alignItems: "center", marginTop: 24, minHeight: 44 },
  deleteText: { color: "#A33F33", fontSize: 14, fontWeight: "600" },
});
