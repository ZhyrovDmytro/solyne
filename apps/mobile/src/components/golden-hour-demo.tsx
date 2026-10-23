import { StyleSheet, Text, View } from "react-native";
import { palette as c } from "../design/theme";
import { BeforeAfterSlider } from "./before-after-slider";

const before = require("../../assets/images/solyne-editorial-before.png");
const after = require("../../assets/images/solyne-editorial.png");

/** Public sample only; personal edited photos stay behind the payment gate. */
export function GoldenHourDemo() {
  return <View>
    <View style={s.frame}>
      <BeforeAfterSlider beforeUri={before} afterUri={after} aspectRatio={2 / 3} contentFit="cover" frameStyle={s.photoFrame} introduce />
    </View>
    <Text style={s.caption}>Drag to compare · AI-generated sample</Text>
  </View>;
}

const s = StyleSheet.create({
  frame: { height: 350, backgroundColor: "#D6C6B2", borderRadius: 26, overflow: "hidden" },
  photoFrame: { borderRadius: 26, borderWidth: 0 },
  caption: { marginTop: 10, fontSize: 10, textAlign: "center", color: c.muted },
});
