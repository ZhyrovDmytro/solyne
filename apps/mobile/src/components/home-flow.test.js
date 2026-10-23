import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomeScreen from "../app/index";

const flow = vi.hoisted(() => ({
  photo: null, actions: new Map(), push: vi.fn(), choose: vi.fn(), camera: vi.fn(),
  setPhoto: vi.fn(), clear: vi.fn(), alert: vi.fn(),
}));
vi.mock("expo-router", () => ({ useRouter: () => ({ push: flow.push }) }));
vi.mock("../state/tan-session", () => ({ useTanSession: () => ({ originalPhoto: flow.photo, setOriginalPhoto: flow.setPhoto, clearSession: flow.clear }) }));
vi.mock("../services/photo-selection", () => ({ choosePhotoFromLibrary: flow.choose, takePhotoWithCamera: flow.camera }));
vi.mock("../components/golden-hour-demo", () => ({ GoldenHourDemo: () => null }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const box = ({ children }) => createElement("div", null, children);
  return {
    View: box, ScrollView: box, Text: box, Image: () => null,
    Pressable: ({ children, onPress, testID, accessibilityLabel }) => {
      if (testID || accessibilityLabel) flow.actions.set(testID ?? accessibilityLabel, onPress);
      return createElement("button", null, children);
    },
    StyleSheet: { create: (styles) => styles }, Platform: { select: (values) => values.default },
    Alert: { alert: flow.alert }, Linking: { openSettings: vi.fn() },
  };
});
vi.mock("react-native-safe-area-context", async () => {
  const { createElement } = await import("react");
  return { SafeAreaView: ({ children }) => createElement("div", null, children) };
});


beforeEach(() => {
  vi.clearAllMocks();
  flow.photo = null;
  flow.actions.clear();
  flow.choose.mockResolvedValue({ status: "cancelled" });
});

function render() { return renderToStaticMarkup(createElement(HomeScreen)); }

describe("selected-photo continuity", () => {
  it("resumes an original through the paywall without asking to select it again", () => {
    flow.photo = { uri: "file://original.jpg" };
    expect(render()).toContain("Continue with my photo");
    flow.actions.get("choose-photo-button")();
    expect(flow.push).toHaveBeenCalledWith("/paywall");
    expect(flow.choose).not.toHaveBeenCalled();
  });
  it("can clear the selection without requiring a membership", () => {
    flow.photo = { uri: "file://original.jpg" };
    render();
    flow.actions.get("Clear selected photo and start over")();
    expect(flow.clear).toHaveBeenCalledOnce();
  });
  it("opens only one picker on rapid repeated taps", async () => {
    let finish;
    flow.choose.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render();
    const press = flow.actions.get("choose-photo-button");
    press();
    press();
    expect(flow.choose).toHaveBeenCalledOnce();
    finish({ status: "cancelled" });
    await vi.waitFor(() => expect(flow.push).not.toHaveBeenCalled());
  });
  it("keeps the current selection and stays put when another picker is cancelled", async () => {
    flow.photo = { uri: "file://original.jpg" };
    render();
    flow.actions.get("choose-another-photo-button")();
    await vi.waitFor(() => expect(flow.choose).toHaveBeenCalledOnce());
    expect(flow.setPhoto).not.toHaveBeenCalled();
    expect(flow.push).not.toHaveBeenCalled();
  });
  it("takes a newly selected original to the paywall before rendering", async () => {
    const photo = { uri: "file://original.jpg" };
    flow.choose.mockResolvedValue({ status: "selected", photo });
    render();
    flow.actions.get("choose-photo-button")();
    await vi.waitFor(() => expect(flow.push).toHaveBeenCalledWith("/paywall"));
    expect(flow.setPhoto).toHaveBeenCalledWith(photo);
  });
});
