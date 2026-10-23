import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackButton } from "../../components/back-button";
import { listSavedEdits, type SavedEdit } from "../../services/edit-library";

const LABELS = { natural: "Natural", golden: "Golden", bronze: "Bronze", deep: "Deep" };

export default function LibraryScreen() {
  const router = useRouter();
  const [edits, setEdits] = useState<SavedEdit[]>([]);
  const [error, setError] = useState(false);

  useFocusEffect(useCallback(() => {
    setError(false);
    let active = true;
    void listSavedEdits().then(
      (items) => { if (active) setEdits(items); },
      () => { if (active) setError(true); },
    );
    return () => { active = false; };
  }, []));

  return (
    <View style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />
          <Text style={styles.title}>Your edits</Text>
          <Text style={styles.subtitle}>Saved in Solyne on this device</Text>
        </View>
        {error ? <Text style={styles.empty}>Your edits could not be loaded. Please reopen the library.</Text> : (
          <FlatList
            contentContainerStyle={styles.list}
            data={edits}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.empty}>Your finished edits will appear here.</Text>}
            renderItem={({ item }) => (
              <Pressable
                accessibilityLabel={`${LABELS[item.preset]} tan, ${new Date(item.createdAt).toLocaleDateString()}`}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/library/[id]", params: { id: item.id } })}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <Image source={{ uri: item.afterUri }} contentFit="cover" style={styles.thumbnail} />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{LABELS[item.preset]} tan</Text>
                  <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  <Text style={styles.cardAction}>Compare and save again ›</Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: "#F7F1EB", flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 20 },
  header: { paddingBottom: 18, paddingTop: 12 },
  title: { marginTop: 18, color: "#241813", fontSize: 34, fontWeight: "600" },
  subtitle: { color: "#7C6A60", fontSize: 14, marginTop: 4 },
  list: { gap: 12, paddingBottom: 24 },
  empty: { color: "#7C6A60", fontSize: 16, paddingTop: 44, textAlign: "center" },
  card: { alignItems: "center", backgroundColor: "#FFFDFC", borderRadius: 18, flexDirection: "row", overflow: "hidden" },
  thumbnail: { height: 112, width: 112 },
  cardText: { flex: 1, paddingHorizontal: 16 },
  cardTitle: { color: "#241813", fontSize: 18, fontWeight: "700" },
  cardDate: { color: "#88776E", fontSize: 13, marginTop: 4 },
  cardAction: { color: "#87573C", fontSize: 13, fontWeight: "600", marginTop: 13 },
  pressed: { opacity: 0.72 },
});
