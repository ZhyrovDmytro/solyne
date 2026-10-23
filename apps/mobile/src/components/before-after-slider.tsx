import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { comparisonIntro } from "../utils/comparison-position";
import { fitPhotoFrame } from "../utils/fit-photo-frame";

interface BeforeAfterSliderProps {
  afterUri: string | number;
  aspectRatio: number;
  beforeUri: string | number;
  contentFit?: "contain" | "cover";
  frameStyle?: StyleProp<ViewStyle>;
  introduce?: boolean;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function BeforeAfterSlider({ afterUri, aspectRatio, beforeUri, contentFit = "contain", frameStyle, introduce = false }: BeforeAfterSliderProps) {
  const [availableSize, setAvailableSize] = useState({ height: 0, width: 0 });
  const [containerWidth, setContainerWidth] = useState(0);
  const [position, setPosition] = useState(0.5);
  const animation = useRef<number | null>(null);
  const interacted = useRef(false);

  function stopIntro() {
    interacted.current = true;
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
  }

  useEffect(() => {
    if (!introduce || containerWidth <= 0) return;
    let disposed = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (disposed || reduced || interacted.current) return;
      let start: number | undefined;
      function tick(now: number) {
        if (disposed || interacted.current) return;
        start ??= now;
        const progress = Math.min(1, (now - start) / 1500);
        setPosition(comparisonIntro(progress) / 100);
        animation.current = progress < 1 ? requestAnimationFrame(tick) : null;
      }
      animation.current = requestAnimationFrame(tick);
    });
    return () => {
      disposed = true;
      if (animation.current !== null) cancelAnimationFrame(animation.current);
    };
  }, [containerWidth, introduce]);

  const frameSize = useMemo(
    () => fitPhotoFrame(availableSize, aspectRatio),
    [aspectRatio, availableSize],
  );

  function updatePosition(next: number) {
    setPosition(clamp(next));
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 2 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onMoveShouldSetPanResponderCapture: (_event, gesture) => Math.abs(gesture.dx) > 2 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (event) => {
          if (containerWidth > 0) {
            updatePosition(event.nativeEvent.locationX / containerWidth);
          }
        },
        onPanResponderTerminationRequest: () => false,
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
      }),
    [containerWidth],
  );

  function handleLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  function handleAccessibilityAction(event: AccessibilityActionEvent) {
    stopIntro();
    if (event.nativeEvent.actionName === "increment") {
      updatePosition(position + 0.1);
    } else if (event.nativeEvent.actionName === "decrement") {
      updatePosition(position - 0.1);
    }
  }

  function handleKey(event: { key: string; preventDefault: () => void }) {
    const delta: Record<string, number> = { ArrowLeft: -0.02, ArrowDown: -0.02, ArrowRight: 0.02, ArrowUp: 0.02 };
    if (!(event.key in delta) && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    stopIntro();
    updatePosition(event.key === "Home" ? 0 : event.key === "End" ? 1 : position + delta[event.key]!);
  }

  const dividerX = containerWidth * position;

  return (
    <View onLayout={(event) => {
      const { width, height } = event.nativeEvent.layout;
      setAvailableSize({ width, height });
    }} style={styles.stage}>
      <View
        accessibilityActions={[
          { label: "Show more of the before photo", name: "increment" },
          { label: "Show more of the after photo", name: "decrement" },
        ]}
        accessibilityLabel="Before and after photo comparison"
        accessibilityRole="adjustable"
        accessibilityValue={{ max: 100, min: 0, now: Math.round(position * 100) }}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position * 100)}
        aria-valuetext={`${Math.round(position * 100)}% original photo`}
        onAccessibilityAction={handleAccessibilityAction}
        onLayout={handleLayout}
        style={[styles.container, contentFit === "cover" ? availableSize : frameSize, frameStyle]}
        testID="before-after-slider"
        {...panResponder.panHandlers}
        onResponderGrant={(...args) => { stopIntro(); panResponder.panHandlers.onResponderGrant?.(...args); }}
        {...(Platform.OS === "web" ? { onKeyDown: handleKey, tabIndex: 0 } : {})}
      >
        <Image
          pointerEvents="none"
          accessibilityLabel="After photo"
          cachePolicy="disk"
          contentFit={contentFit}
          source={typeof afterUri === "string" ? { cacheKey: afterUri, uri: afterUri } : afterUri}
          style={styles.fullImage}
        />

        <View pointerEvents="none" style={[styles.beforeClip, { width: dividerX }]}>
          <Image
            accessibilityLabel="Before photo"
            contentFit={contentFit}
            source={typeof beforeUri === "string" ? { uri: beforeUri } : beforeUri}
            style={[styles.beforeImage, { width: containerWidth }]}
          />
        </View>

        <View pointerEvents="none" style={styles.labels}>
          <Text style={styles.label}>BEFORE</Text>
          <Text style={styles.label}>AFTER</Text>
        </View>

        <View pointerEvents="none" style={[styles.divider, { left: dividerX }]} />
        <View pointerEvents="none" style={[styles.handle, { left: dividerX }]}>
          <Text style={styles.handleText}>‹ ›</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E9DED6",
    borderColor: "#DED0C6",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  stage: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 0 },
  fullImage: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  beforeClip: { bottom: 0, left: 0, overflow: "hidden", position: "absolute", top: 0 },
  beforeImage: { bottom: 0, left: 0, position: "absolute", top: 0 },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    left: 14,
    position: "absolute",
    right: 14,
    top: 14,
  },
  label: {
    backgroundColor: "rgba(36, 24, 19, 0.72)",
    borderRadius: 12,
    color: "#FFFDFC",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  divider: {
    backgroundColor: "#FFFDFC",
    bottom: 0,
    position: "absolute",
    top: 0,
    transform: [{ translateX: -1 }],
    width: 2,
  },
  handle: {
    alignItems: "center",
    backgroundColor: "#FFFDFC",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    position: "absolute",
    top: "50%",
    transform: [{ translateX: -18 }, { translateY: -18 }],
    width: 36,
  },
  handleText: { color: "#3C2D26", fontSize: 17, fontWeight: "800", letterSpacing: 1 },
});
