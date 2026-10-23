import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { hasPaidAccess } from "../services/billing";
import { TanSessionProvider } from "../state/tan-session";

export default function RootLayout() {
  return (
    <TanSessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="legal" />
        <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
        <Stack.Protected guard={hasPaidAccess()}>
        {/* Horizontal photo gestures must never pop the editor. */}
        <Stack.Screen name="editor" options={{ gestureEnabled: false }} />
        <Stack.Screen name="processing" options={{ gestureEnabled: false }} />
        <Stack.Screen name="result" options={{ gestureEnabled: false }} />
        <Stack.Screen name="library/index" />
        <Stack.Screen name="library/[id]" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="dark" />
    </TanSessionProvider>
  );
}
