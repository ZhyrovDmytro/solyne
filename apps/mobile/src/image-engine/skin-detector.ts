import type { FaceLandmarker as FaceLandmarkerInstance } from "@mediapipe/tasks-vision";
import { initializeMediaPipe } from "./mediapipe-logging";
import { excludePolygons, featherInside, resizeMask, skinMaskFromConfidence } from "./skin-mask";

// Keep the WASM runtime identical to the pinned JS package; version the model too.
const RUNTIME_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/vision_bundle.mjs";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite";

const FACE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
// Ordered outlines from MediaPipe's canonical face mesh connections.
const FEATURE_OUTLINES = [
  [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
  [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185],
];

export async function detectSkin(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
  onStatus: (message: string) => void,
): Promise<{ mask: Uint8Array; inferenceMs: number }> {
  onStatus("Loading skin selection… First use needs internet.");
  // This browser-only SDK contains dynamic WASM imports Metro cannot transform.
  // Expo's documented opt-out lets the WebView load the pinned ES module directly.
  const { FaceLandmarker, FilesetResolver, ImageSegmenter } = await import(
    /* @metro-ignore */ /* @vite-ignore */ RUNTIME_URL
  ) as typeof import("@mediapipe/tasks-vision");
  signal.throwIfAborted();
  const files = await FilesetResolver.forVisionTasks(WASM_URL);
  signal.throwIfAborted();
  const response = await fetch(MODEL_URL, { signal });
  if (!response.ok) throw new Error("The skin model could not be downloaded. Check your connection and retry.");
  const modelAssetBuffer = new Uint8Array(await response.arrayBuffer());
  signal.throwIfAborted();
  // CPU avoids reported iOS GPU category corruption (MediaPipe issue #6142).
  const segmenter = await initializeMediaPipe(() => ImageSegmenter.createFromOptions(files, {
    baseOptions: { modelAssetBuffer, delegate: "CPU" },
    runningMode: "IMAGE",
    outputCategoryMask: false,
    outputConfidenceMasks: true,
  }));
  let landmarker: FaceLandmarkerInstance | undefined;
  try {
    signal.throwIfAborted();
    onStatus("Separating skin from hair and clothes…");
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    signal.throwIfAborted();
    const startedAt = performance.now();
    let mask: Uint8Array | undefined;
    segmenter.segment(canvas, result => {
      const confidence = result.confidenceMasks;
      if (!confidence?.[0]) throw new Error("The skin detector returned no mask. Please retry.");
      const { width, height } = confidence[0];
      const raw = skinMaskFromConfidence(confidence.map(item => item.getAsFloat32Array()), width, height);
      mask = featherInside(resizeMask(raw, width, height, canvas.width, canvas.height), canvas.width, canvas.height);
    });
    if (!mask) throw new Error("The skin detector returned no mask. Please retry.");
    const segmentationMs = performance.now() - startedAt;
    onStatus("Protecting eyes and lips…");
    const faceResponse = await fetch(FACE_MODEL_URL, { signal });
    if (!faceResponse.ok) throw new Error("Face detail protection could not load. Check your connection and retry.");
    const faceBuffer = new Uint8Array(await faceResponse.arrayBuffer());
    signal.throwIfAborted();
    landmarker = await initializeMediaPipe(() => FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetBuffer: faceBuffer, delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: 6,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    }));
    signal.throwIfAborted();
    const faceStartedAt = performance.now();
    const faces = landmarker.detect(canvas).faceLandmarks;
    const polygons = faces.flatMap(face => FEATURE_OUTLINES.map(outline => outline.flatMap(index => {
      const point = face[index];
      return point ? [{ x: point.x * canvas.width, y: point.y * canvas.height }] : [];
    })));
    excludePolygons(mask, canvas.width, canvas.height, polygons);
    return { mask: featherInside(mask, canvas.width, canvas.height), inferenceMs: Math.round(segmentationMs + performance.now() - faceStartedAt) };
  } finally {
    landmarker?.close();
    segmenter.close();
  }
}
