import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { legalDocuments } from "../config/legal-documents";
import { palette as c } from "../design/theme";

export default function LegalScreen() {
  const router = useRouter();
  const { document } = useLocalSearchParams<{ document?: string }>();
  const selected = document === "terms" || document === "support" ? document : "privacy";
  const website = process.env.EXPO_PUBLIC_WEBSITE_URL?.trim().replace(/\/+$/, "");
  const title = selected === "privacy" ? "Privacy Policy" : selected === "terms" ? "Terms of Use" : "Support";

  async function openWebsite() {
    try {
      if (!website || !website.startsWith("https://")) throw new Error("Website unavailable");
      await Linking.openURL(`${website}/${selected}`);
    } catch {
      Alert.alert("Website unavailable", "Please read the document here and try the website again later.");
    }
  }

  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.content}>
        <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={s.button}><Text style={s.link}>Done</Text></Pressable>
        <Text accessibilityRole="header" style={s.title}>{title}</Text>
        <Text style={s.notice}>Draft documents: operator and contact fields must be completed before release.</Text>
        {website && <Pressable accessibilityRole="link" onPress={() => void openWebsite()} style={s.button}><Text style={s.link}>Read on the Solyne website ↗</Text></Pressable>}
        <Text selectable style={s.body}>{legalDocuments[selected]}</Text>
        {(["privacy", "terms", "support"] as const).filter(item => item !== selected).map(item => <Pressable key={item} accessibilityRole="link" onPress={() => router.setParams({ document: item })} style={s.button}><Text style={s.link}>{item === "privacy" ? "Privacy Policy" : item === "terms" ? "Terms of Use" : "Support"}</Text></Pressable>)}
        {selected === "terms" && <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/").catch(() => Alert.alert("Link unavailable", "Please try again later."))} style={s.button}><Text style={s.link}>Apple Standard EULA ↗</Text></Pressable>}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.paper },
  content: { width: "100%", maxWidth: 700, alignSelf: "center", padding: 24, gap: 18 },
  title: { fontSize: 28, color: c.ink, fontWeight: "600" },
  notice: { fontSize: 13, lineHeight: 20, color: c.muted },
  body: { fontSize: 15, lineHeight: 24, color: c.ink },
  button: { minHeight: 44, justifyContent: "center" },
  link: { color: c.olive, textDecorationLine: "underline", fontSize: 15 },
});
