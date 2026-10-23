import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette as c, editorialFont } from "../design/theme";
import { DESIGN_PLANS, purchaseMembership, restoreMembership, type PlanId } from "../services/billing";
import { useTanSession } from "../state/tan-session";


export default function PaywallScreen() {
  const router = useRouter();
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 800;
  const pinnedCheckout = height >= 650 && fontScale <= 1.3;
  const { originalPhoto } = useTanSession();
  const [plan, setPlan] = useState<PlanId>("annual");
  const [busy, setBusy] = useState<"purchase" | "restore" | null>(null);
  const lock = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const selected = DESIGN_PLANS.find((item) => item.id === plan)!;

  async function act(action: "purchase" | "restore") {
    if (lock.current) return;
    lock.current = true;
    setBusy(action);
    setMessage(null);
    try {
      if (action === "purchase") await purchaseMembership(plan);
      else await restoreMembership();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Could not connect. Please try again.";
      setMessage(originalPhoto ? `${detail} Your selected photo is still here.` : detail);
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }

  const checkout = (
    <>
        {message && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.message}>{message}</Text>}
        <Pressable accessibilityRole="button" disabled={busy !== null} onPress={() => void act("purchase")} style={({ pressed }) => [s.cta, pressed && s.pressed, busy !== null && s.pressed]}>
          {busy === "purchase" ? <ActivityIndicator color={c.white} /> : <Text style={s.ctaText}>Get Solyne Plus <Text>↗</Text></Text>}
        </Pressable>
        <Text style={s.renewal}>{selected.price} / {selected.period}. No free trial. At launch, subscriptions will renew automatically unless canceled in your store settings. No payment is taken in this build.</Text>
        <View style={s.footer}>
          <Pressable accessibilityRole="button" disabled={busy !== null} onPress={() => void act("restore")} style={s.footerButton}><Text style={s.link}>{busy === "restore" ? "Restoring…" : "Restore purchases"}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push("/legal?document=terms")} style={s.footerButton}><Text style={s.link}>Terms</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push("/legal?document=privacy")} style={s.footerButton}><Text style={s.link}>Privacy</Text></Pressable>
        </View>
    </>
  );

  return (
    <SafeAreaView style={s.page}>
      <ScrollView style={s.scroll} contentContainerStyle={[s.content, compact && s.compactContent]}>
        <View style={s.nav}>
          <Text style={s.wordmark}>solyne<Text style={s.plus}> plus</Text></Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close membership options" disabled={busy !== null} onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={s.close}><Text style={s.closeText}>×</Text></Pressable>
        </View>
        {(!compact || originalPhoto) && <View style={s.photoRow}>
          {originalPhoto ? <Image source={{ uri: originalPhoto.uri }} style={s.photo} /> : <View style={[s.photo, s.sun]}><Text style={s.sunIcon}>☀</Text></View>}
          <View style={s.photoCopy}><Text style={s.eyebrow}>{originalPhoto ? "YOUR PHOTO IS READY" : "A LITTLE MORE GOLDEN"}</Text><Text style={s.photoTitle}>{originalPhoto ? "Next, make it yours." : "Your light. Your look."}</Text><Text style={s.small}>Personal editing starts after payment.</Text></View>
        </View>}
        <Text style={[s.title, compact && s.compactTitle]}>{"Golden hour.\nOn your terms."}</Text>
        <Text style={s.description}>A natural-looking tan, with every detail still you.</Text>
        <View style={s.benefits}>
          {["Find your shade with live intensity control", "Refine exactly where your tan goes", "Save high-quality PNG photos (up to 2048px)"].map((text) => <View key={text} style={s.benefit}><Text style={s.check}>✓</Text><Text style={s.benefitText}>{text}</Text></View>)}
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel="Choose a Solyne Plus plan" style={s.plans}>
          {DESIGN_PLANS.map((item) => <Pressable key={item.id} accessibilityRole="radio" aria-checked={plan === item.id} accessibilityState={{ checked: plan === item.id, disabled: busy !== null }} accessibilityLabel={`${item.name}, ${item.price} per ${item.period}, ${item.detail}. Illustrative pricing.`} disabled={busy !== null} onPress={() => { setPlan(item.id); setMessage(null); }} style={[s.plan, plan === item.id && s.selected]}>
            <View style={[s.radio, plan === item.id && s.radioSelected]}>{plan === item.id && <View style={s.dot} />}</View>
            <View style={s.planCopy}><View style={s.planHeading}><Text style={s.planName}>{item.name}</Text>{item.badge && <Text style={s.badge}>{item.badge}</Text>}</View><Text style={s.small}>{item.detail}</Text></View>
            <View style={s.priceBlock}><Text style={s.price}>{item.price}</Text><Text style={s.small}>/ {item.period}</Text></View>
          </Pressable>)}
        </View>
        <Text style={s.disclosure}>Illustrative USD pricing · Purchases coming soon</Text>
        {!pinnedCheckout && <View style={s.checkoutInline}>{checkout}</View>}
      </ScrollView>
      {pinnedCheckout && <View style={s.checkout}>{checkout}</View>}

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.paper }, scroll: { flex: 1 }, checkoutInline: { gap: 12 }, checkout: { width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, gap: 12, borderTopWidth: 1, borderColor: c.line, backgroundColor: c.paper }, content: { width: "100%", maxWidth: 520, alignSelf: "center", padding: 24, paddingTop: 8, gap: 18 },
  compactContent: { gap: 14 }, compactTitle: { fontSize: 36, lineHeight: 40 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, wordmark: { fontFamily: editorialFont, fontSize: 30, color: c.ink }, plus: { fontFamily: undefined, fontSize: 13, color: c.olive },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: c.cream }, closeText: { color: c.ink, fontSize: 26 },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 16, borderRadius: 20, backgroundColor: c.cream, padding: 12 }, photo: { width: 68, height: 84, borderRadius: 12 }, photoCopy: { flex: 1, gap: 6 }, eyebrow: { color: c.olive, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 }, photoTitle: { fontFamily: editorialFont, fontSize: 22, color: c.ink }, small: { color: c.muted, fontSize: 12, lineHeight: 18 },
  sun: { backgroundColor: "#DDD4AF", alignItems: "center", justifyContent: "center" }, sunIcon: { color: c.olive, fontSize: 34 },
  title: { fontFamily: editorialFont, fontSize: 44, lineHeight: 48, letterSpacing: -1.4, color: c.ink }, description: { fontSize: 16, color: c.muted, lineHeight: 24 },
  benefits: { gap: 13, paddingVertical: 4 }, benefit: { flexDirection: "row", gap: 12, alignItems: "center" }, check: { color: c.olive, fontSize: 17 }, benefitText: { color: c.ink, fontSize: 14, flex: 1, lineHeight: 20 },
  plans: { gap: 10 }, plan: { minHeight: 86, flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderWidth: 1.5, borderColor: c.line, borderRadius: 18 }, selected: { borderColor: c.olive, backgroundColor: "#EEF0E5" }, radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: c.line, alignItems: "center", justifyContent: "center" }, radioSelected: { borderColor: c.olive }, dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.olive }, planCopy: { flex: 1, gap: 4 }, planHeading: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }, planName: { fontSize: 16, fontWeight: "600", color: c.ink }, badge: { backgroundColor: c.olive, color: c.white, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, fontSize: 10 }, priceBlock: { alignItems: "flex-end" }, price: { fontSize: 20, fontWeight: "600", color: c.ink },
  disclosure: { color: c.muted, fontSize: 12, textAlign: "center", marginTop: -6 }, cta: { minHeight: 58, backgroundColor: c.olive, borderRadius: 30, alignItems: "center", justifyContent: "center" }, ctaText: { color: c.white, fontSize: 16, fontWeight: "600" }, renewal: { fontSize: 11, lineHeight: 17, color: c.muted, textAlign: "center" }, footer: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap" }, footerButton: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }, link: { fontSize: 12, color: c.olive, textDecorationLine: "underline" }, message: { backgroundColor: c.cream, padding: 14, borderRadius: 14, color: c.ink, fontSize: 13, lineHeight: 20 }, pressed: { opacity: 0.7 },
});
