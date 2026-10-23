# IMPLEMENTATION_STATUS.md

## Current State
**Stage:** Segmentation validation

**Current objective:** Validate the new live local-preview flow and exposed-skin mask on real photos while continuing the broader segmentation comparison.

The generative POC reached end-to-end generation and local-library work, but it is no longer the preferred architecture for Add Tan because generation introduces latency, cost, non-determinism, and subject/background drift. OpenAI GPT Image now replaces Kling as the default cloud comparison provider.

## Phase Status

| Phase | Status | Notes |
|---|---|---|
| Legacy 1–7 generative POC | Implemented/partially validated | Keep temporarily for comparison; freeze feature development |
| Legacy local edit library | Implemented, device validation pending | Reuse where compatible |
| M0. Architecture migration | Complete | Source-of-truth docs aligned; typed pipeline boundaries added; legacy code retained |
| M1. Segmentation benchmark harness | Complete | BodyPix baseline produces original/raw-mask/overlay/diagnostics artifacts |
| M2. Candidate segmentation benchmark | In progress | MediaPipe SelfieMulticlass integrated and smoke-tested against the existing portrait; representative dataset still pending |
| M3. Mask refinement | Prototype implemented | Semantic confidence gate, inward feathering, face landmark exclusions, manual add/remove and undo |
| M4. Deterministic tan renderer | Prototype implemented | OKLab-based source-relative transform in Expo DOM preview |
| M5. Live mobile editor | Prototype implemented | One segmentation pass + cached mask + immediate local slider |
| M6. Native optimization | Conditional | Only if measurements require it |
| M7. Save/share/library migration | Partial | Lossless PNG export at normalized source resolution (up to 2048px), archive, comparison and Photos save wired; device validation pending |
| M8. Tan-line research | Deferred | Separate tone-analysis pipeline |

## Current Decisions
- React Native + Expo remains the application/product layer.
- The primary Add Tan architecture is segmentation + deterministic rendering.
- Generative image editing is no longer the default Add Tan path.
- AI/ML should determine editable skin pixels; it should not regenerate the photograph.
- The original image remains immutable.
- Segmentation should run once per selected image and the mask should be cached.
- Tan intensity should be continuous and update without network calls or new inference.
- Prefer on-device segmentation/rendering if benchmark quality permits.
- Native iOS code is allowed behind a narrow typed Expo/native-module boundary.
- Do not rewrite the whole application in Swift.
- The segmentation model/runtime remains replaceable until benchmark evidence selects one.
- Tan-line removal is a separate future pipeline, not an Add Tan preset.
- OpenAI GPT Image is the default Express comparison provider. Kling and Replicate adapters remain temporarily for migration safety and should not receive new primary-flow features.
- The OpenAI comparison path is implemented and unit-tested, but a real request is blocked locally until `OPENAI_API_KEY` is configured in the backend environment.
- `@solyne/image-pipeline` owns framework-independent `SkinMaskEngine`, `MaskRefiner`, and `TanRenderer` boundaries.
- The M1 BodyPix + color-consistency implementation is benchmark-only and is not a selected production/mobile runtime.
- The Expo DOM/WebView prototype now uses MediaPipe SelfieMulticlass and Face Landmarker with Canvas, without calling `/api/v1/tan`. BodyPix remains the benchmark baseline.
- Slider changes reuse the cached mask and precomputed tan transform; they do not rerun segmentation or make network requests.
- The DOM prototype is a fast validation path, not the final native boundary or selected production runtime.

## Current Blockers
- We have not yet proven exposed-skin mask quality across the 30–50-image representative dataset.
- The best segmentation model/runtime for the current Expo/iOS stack is not selected.
- The tan color transform has not yet been calibrated across varied skin tones/lighting.
- We do not yet know whether the live renderer needs native Core Image/Metal or can meet preview targets with a simpler implementation.
- The BodyPix baseline contaminated hair/clothing. The new semantic model visibly improves the existing portrait, but representative skin-tone, lighting, full-body and multi-person comparisons are still required.
- Pinned MediaPipe JS/WASM and both models load over HTTPS; first use needs internet. Offline behavior and model asset bundling are not verified.
- Export re-renders the normalized source (maximum 2048px from photo import), using the corrected preview mask. It does not recover original camera resolution or mask detail lost at the model’s 256px input.
- The legacy generative processing route remains in the repository for comparison but is no longer called by the primary editor.

## Current Selection Upgrade — 2026-10-15
- Runtime: pinned MediaPipe Tasks Vision 1.1.1, CPU delegate; SelfieMulticlass 256×256 float32 v1 and Face Landmarker float16 v1.
- Select only winning body/face skin classes with sufficient combined confidence; no RGB skin-color gate in the active editor.
- Preserve zero-mask support during resizing and feather inward. Protect eye and outer-mouth polygons for up to six detected faces. Missed/profile/small faces and eyebrows still require review.
- Add/remove brushes with continuous strokes, ten undo steps, reset to automatic mask, original toggle, retry and empty-selection guidance. Manual additions deliberately override the automatic selection.
- Export is PNG from the immutable normalized source; excluded decoded source pixels remain unchanged. Selection overlays/comparison mode are never exported.
- Expo iOS + DOM production bundle export passed. The SDK uses Expo’s documented `@metro-ignore` external ES-module loading because Metro cannot bundle its internal dynamic WASM imports.
- Typecheck, lint and 75 tests passed. Browser smoke checks covered model loading, facial exclusions, removal, undo, comparison and PNG export. Physical iPhone validation remains pending.
- See `docs/SKIN_SELECTION.md` for decisions, sources and remaining limits.

## Next Task
Validate the live Expo editor on representative real photos, then continue **M2 — Candidate segmentation benchmark**.

Acceptance criteria:
- assemble 30–50 non-private/licensed representative photos under the git-ignored `test-images/` directory;
- run the existing BodyPix baseline over the same dataset;
- evaluate at least one additional viable segmentation model/runtime;
- score coverage, contamination, boundaries, failures, and runtime consistently;
- record the device/backend and licensing constraints;
- select the best quality/runtime tradeoff or stop if neither approach reaches the mask gate;
- do not migrate the production editor until the checkpoint is reviewed.

## M1 Benchmark Result
- Engine: BodyPix MobileNetV1 0.75, stride 16, 2-byte weights, TensorFlow.js CPU backend.
- Selection: BodyPix body-part candidate pixels intersected with a broad color-consistency score; the heuristic is never used as a standalone detector.
- Public validation fixture: TensorFlow body-segmentation portrait, normalized from 820×1024 to 410×512.
- Measured inference: about 1.1 seconds at 410×512 on the development Mac CPU backend; this is not an iPhone performance result.
- Artifacts: normalized original, raw mask, raw-mask overlay, and JSON diagnostics.
- Observed failures: hair was selected with the face; small shoulder/clothing/accessory contamination remained; no refinement, feature exclusion, or edge-aware feathering exists yet.
- Conclusion: the harness works, but one fixture cannot establish mask quality and the baseline does not pass the production acceptance gate.

## Benchmark Focus
Prioritize:
- face/neck
- arms/hands/fingers
- legs/feet
- hair over skin
- clothing/swimwear edges
- tattoos
- jewelry/watches
- multiple people
- varied skin tones
- warm/cool lighting
- complex backgrounds

## Known Risks
1. Human-parsing models may not distinguish exposed skin precisely enough at fine boundaries.
2. Hands/fingers, hair overlap, bikini straps, and jewelry may require refinement beyond raw segmentation.
3. A skin-color heuristic alone will fail across lighting and diverse skin tones; it must not be the sole selector.
4. A naive tint can look fake even with a perfect mask; renderer calibration is a separate quality problem.
5. On-device model size/inference time may require model conversion/quantization or a native module.
6. Full-resolution export may require a different rendering path from interactive preview.
7. Existing local-library metadata assumes generated outputs and may need schema/version changes.

## Update Rules
Update after milestone-level tasks:
- mark phase status;
- record durable decisions from measurements;
- update Next Task;
- remove resolved blockers;
- keep legacy history concise.

Do not use this file as a chronological log.
