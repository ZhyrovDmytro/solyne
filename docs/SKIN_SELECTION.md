# Skin selection implementation

## Decision
The active editor uses MediaPipe SelfieMulticlass instead of BodyPix plus an RGB heuristic. BodyPix labels anatomy through clothes; an RGB gate cannot reliably distinguish brown hair or beige clothes from skin. SelfieMulticlass predicts background, hair, body skin, face skin, clothes and accessories. This is a better semantic fit, not proof of production accuracy.

The existing BodyPix benchmark remains unchanged for comparison. No generative API or credential is needed for the editor.

## Pipeline
1. Normalize imported photos with the existing 2048px limit. Keep that source immutable.
2. Decode a preview up to 1024px. Run SelfieMulticlass (256px model input) once.
3. Accept only a winning face/body skin class. Fade combined skin confidence from 0.55 to 0.90. No source RGB threshold, so selection does not explicitly reject dark or unusually lit skin by color.
4. Resize with support-preserving interpolation and soften inward; zero-mask areas stay excluded.
5. Run Face Landmarker once, up to six faces. Remove polygons around eyes and the outer mouth, including teeth, then soften inside the remaining selection.
6. Allow explicit manual additions/removals, ten undo steps, and reset. A manual addition can select any pixel; users must review what they paint.
7. Blend the precomputed OKLab transform with the cached mask. No slider-time inference or network request.
8. Render the corrected mask against the normalized source into a separate export canvas. Use PNG to preserve decoded source pixels outside the mask. Never export the pink overlay or original-comparison display.

## Runtime and packaging
- `@mediapipe/tasks-vision` pinned to 1.1.1; external JS module and WASM URLs use the same version.
- Versioned Google model URLs: SelfieMulticlass float32 v1 and Face Landmarker float16 v1.
- CPU delegate chosen because of the reported iOS GPU category-label issue; hardware performance remains unmeasured.
- The SDK contains a dynamic import Metro rejects. The browser-only loader uses Expo's documented `@metro-ignore` import opt-out; iOS and DOM production bundles were built successfully.
- MediaPipe writes its successful XNNPACK CPU startup notice to stderr, which Expo treats as a console error. During model initialization, only that exact notice is routed to `console.info`; all other errors and thrown failures are preserved. Logging is restored after initialization, including overlapping runs and failures.
- No silent fallback to the less accurate RGB mask. Failed loading/inference shows retry; a 60-second preparation timeout prevents indefinite loading. Cancellation disposes models once outstanding initialization completes.
- First use requires internet. Production model/runtime bundling, attribution, caching and network/offline verification are still open work.

## Evidence and limits
On the repository's public portrait (410×512), browser inspection showed face/hands selected, hair/suit/background excluded, and eye/mouth cutouts present. Warm inference plus refinement was approximately 0.25–0.33 seconds on the development Mac browser; that excludes downloads/initialization and is not an iPhone result. Previous BodyPix CPU benchmark timing is not directly comparable across these runtimes.

Browser checks also covered empty/no-person input, broken-image retry, source changes, removal/undo, original comparison and export. A deliberately upscaled fixture verified 1640×2048 PNG export from a 1024px preview; this tests resolution handling, not additional model accuracy. Layout checks found no horizontal overflow at 320, 768, 1024 and 1440px. The inspected overlay is in the git-ignored `benchmark-output/editor-check/selection.png`.

Automated tests cover semantic exclusions, uncertain predictions, shape mismatch, inward feathering, support-preserving resizing, continuous brush strokes, polygon exclusions, immutable source rendering, manual additions, zero intensity, and PNG persistence/error handling.

Remaining limits:
- No representative 30–50 photo benchmark or quantitative acceptance score yet.
- Hair strands, straps, jewelry, tattoos, dark skin, difficult light, profiles and small faces require testing. The model card explicitly does not promise pixel-perfect masks.
- All detected people are included; there is no individual-person picker. Face detail protection is capped at six faces, and absent landmarks do not mean there is no person.
- Eyebrows are not separately excluded; manual correction remains necessary for missed details.
- Brush editing is pointer/touch based; buttons/sliders support keyboard use. A keyboard painting workflow and zoom are not implemented.
- Preview corrections and model resolution limit fine export boundaries. Export preserves normalized source resolution, not the camera original.
- Inference/export run synchronously in the WebView and can briefly block it. Physical device memory, latency, scrolling/touch and Photos/library verification are still required.

## Sources
- [Google image segmentation models and classes](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter)
- [SelfieMulticlass model card, license and limitations](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf)
- [Image Segmenter web API](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter/web_js)
- [Face Landmarker web API](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [Canonical facial feature connections](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py)
- [Reported iOS GPU category issue](https://github.com/google-ai-edge/mediapipe/issues/6142)
- [Expo Metro external dynamic imports](https://docs.expo.dev/versions/v57.0.0/config/metro/)
