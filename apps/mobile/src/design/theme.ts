import { Platform } from "react-native";

export const palette = {
  paper: "#F8F5EF", ink: "#292E25", muted: "#68705F", line: "#DDDCD0",
  olive: "#48543A", cream: "#EFEBDD", white: "#FFFFFF", gold: "#B17B4D",
};
export const editorialFont = Platform.select({ ios: "Georgia", default: "serif" });
