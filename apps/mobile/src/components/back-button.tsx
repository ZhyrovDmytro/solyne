import { Pressable, StyleSheet, Text } from "react-native";

interface BackButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  overlay?: boolean;
}

export function BackButton({ label, onPress, disabled = false, overlay = false }: BackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === "Back" ? "Go back" : `Back to ${label.toLowerCase()}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, overlay && styles.overlay, (pressed || disabled) && styles.dimmed]}
    >
      <Text accessible={false} style={[styles.chevron, overlay && styles.light]}>‹</Text>
      <Text style={[styles.label, overlay && styles.light]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DED0C6",
    backgroundColor: "#FFFDFC",
  },
  chevron: { color: "#87573C", fontSize: 28, lineHeight: 30 },
  label: { color: "#3C2D26", fontSize: 14, fontWeight: "600" },
  overlay: { backgroundColor: "rgba(24, 20, 17, 0.55)", borderColor: "rgba(255, 253, 252, 0.22)" },
  light: { color: "#FFFDFC" },
  dimmed: { opacity: 0.5 },
});
