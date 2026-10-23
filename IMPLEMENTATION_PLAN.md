# Solyne — Mask-Based Tan POC Implementation Plan for Codex

> **Architecture pivot:** Solyne's primary Add Tan flow is moving away from generative image regeneration (Kling/Replicate/FLUX) to **AI-assisted exposed-skin segmentation + deterministic local tan rendering**. Existing provider code is legacy experimental work and should remain untouched unless a migration task explicitly addresses it.

## Goal
Validate that Solyne can identify exposed human skin accurately enough to apply a realistic tan without regenerating the person or photograph.

The critical hypothesis is:

> Can we create a reliable exposed-skin mask across real consumer photos?

If yes, the tan itself should be a deterministic, interactive image-processing operation.

## Target User Flow

```text
Launch
→ choose/take photo
→ detect exposed skin once
→ open editor
→ drag tan intensity live
→ compare before/after
→ save/share
```

No network generation should occur when the user changes tan intensity.

## What This POC Must Prove
1. Exposed-skin selection is accurate.
2. Hair/clothes/background are excluded well enough.
3. Deterministic tanning looks realistic across varied skin tones and lighting.
4. The slider can update interactively.
5. Original identity, geometry, texture, tattoos, and background remain pixel-aligned and unchanged except for intended skin-color transformation.

## What This POC Does Not Need to Prove
- cloud scalability
- provider orchestration
- prompt engineering
- accounts
- payments
- cross-device history
- automatic tan-line removal
- generic photo editing

## Technical Strategy

### Stage A — Segmentation Spike First
Before rewriting the main UX, create a development benchmark that takes local test photos and produces:
- original
- raw segmentation mask
- refined mask overlay

Benchmark candidate approaches for exposed human skin/body-part segmentation.

The architecture must allow replacing the model/runtime without changing product UI.

### Stage B — Mask Refinement
Build a refinement layer independent of the model.

Potential operations:
- threshold confidence
- resize/alignment
- remove small isolated components
- fill appropriate holes
- morphological cleanup
- edge-aware feathering
- optional exclusion masks for hair/clothing/features
- optional skin-color consistency checks

Do not hide poor segmentation with excessive blur.

### Stage C — Deterministic Tan Renderer
Implement a renderer that takes:

```ts
{
  originalImage,
  skinMask,
  intensity, // 0..1
  tone?      // optional later
}
```

and returns a preview/export without generative AI.

Start with a perceptual color-space approach (OKLab/Lab or equivalent) that adjusts pigmentation while preserving local luminance/texture.

Do not use a naive semi-transparent brown overlay as the final algorithm.

### Stage D — Live Editor
Replace discrete paid-generation presets as the primary interaction with a continuous intensity control.

Suggested UX:

```text
Tan intensity
0% ─────────●───────── 100%
```

Optional semantic stops can remain as labels:
- Natural
- Golden
- Bronze
- Deep

but they map to deterministic parameter values rather than separate AI requests.

Segmentation runs once per selected photo. Slider movement only rerenders.

### Stage E — Export / Library
Render the selected settings at export resolution, then reuse the existing local save/share/library concepts where compatible.

Saved edit metadata should include enough parameters to reproduce the edit if practical:
- source reference/copy
- mask or mask version
- intensity
- tone parameters
- renderer version

## React Native / Native Strategy
Keep React Native + Expo for the application.

Do not rewrite the whole app in Swift.

Prototype the mask/renderer using the simplest viable implementation. If JS/runtime performance or model support is insufficient, introduce a narrow Expo/native iOS module:

```text
React Native
   ↓
SolyneImageEngine native module
   ├── segmentation (Core ML / Vision)
   └── rendering (Core Image / Metal)
```

UI/domain code must not know native implementation details.

## Segmentation Evaluation Dataset
Use 30–50 non-private/licensed test photos covering:
- selfie
- face + shoulders
- full body
- swimsuit/bikini
- shorts/dresses
- crossed arms
- hands near face
- fingers
- long hair over skin
- blonde/dark hair
- tattoos
- watches/jewelry
- indoor warm light
- direct sun
- shade
- pale skin
- already-tanned skin
- varied skin tones
- multiple people
- partial/occluded bodies
- complex backgrounds

Do not commit private photos.

## Mask Quality Score
Score each image 1–5:
- face coverage
- neck/torso coverage
- arms/hands coverage
- legs/feet coverage
- hair exclusion
- clothing/swimwear exclusion
- background exclusion
- fine boundaries/fingers
- tattoo handling
- multiple-person behavior

Also record:
- model/runtime
- inference time
- device
- mask resolution
- refinement settings
- obvious failure notes

## Mask Acceptance Gate
Do not invest heavily in the final tan renderer until representative mask quality is strong.

Initial target:
- >= 90% of obvious exposed-skin area captured on representative photos
- <= 2% obvious non-skin contamination in important visible regions
- no recurring severe clothing/hair/background bleed
- hands/fingers and face boundaries acceptable for normal phone viewing

These are initial engineering targets and should be revised from benchmark evidence.

## Tan Renderer Evaluation
For accepted masks, render at 0%, 25%, 50%, 75%, and 100%.

Score:
- natural color
- no orange/red cast
- texture preservation
- highlight/shadow preservation
- consistent face/body result
- tattoo preservation
- edge blending
- varied skin-tone behavior

Never map all users toward one target skin color. The transform must be relative to the source skin and illumination.

## Performance Targets
Measure on a recent physical iPhone:
- segmentation: ideally <= 2 s
- mask refinement: sub-second if practical
- live preview: target 60 FPS
- slider: no network requests
- export: acceptable consumer latency
- marginal server/AI cost for Add Tan: $0 if fully on-device

Do not compromise mask quality merely to hit the first performance target.

## Existing Generative Code
Current Kling/Replicate/Express work is not deleted in the first migration task.

Rules:
- freeze feature development on the generative Add Tan path;
- do not route new editor behavior through `/api/v1/tan`;
- retain it temporarily for visual comparison;
- mark provider-specific docs/code as legacy where appropriate;
- remove it only after the local mask pipeline proves viable and a separate cleanup task is approved.

## Error States
New primary errors are local:
- no person/skin detected
- segmentation failed
- unsupported image
- insufficient memory
- export failed
- Photos permission denied

Do not surface provider timeout/rate-limit errors in the active Add Tan path.

## Development Phases

### Phase M0 — Architecture Migration
- update docs/source-of-truth
- identify existing generative modules as legacy
- add domain interfaces for mask/rendering
- do not delete working provider code

### Phase M1 — Segmentation Benchmark Harness
- create local/dev-only benchmark runner
- load test image
- run `SkinMaskEngine`
- output raw mask + overlay
- capture inference timing
- no product UI changes required

**Checkpoint:** inspect masks before proceeding.

### Phase M2 — Candidate Model Benchmark
- evaluate at least 2 viable segmentation approaches if available
- use the same dataset
- score failures
- choose the best quality/runtime tradeoff

**Checkpoint:** record decision in architecture/status.

### Phase M3 — Mask Refinement
- implement model-independent refinement
- output raw vs refined masks
- tune edge behavior
- specifically test hair, clothing, hands/fingers

### Phase M4 — Tan Renderer Prototype
- deterministic color transform
- original + mask + intensity
- produce 0/25/50/75/100 benchmark outputs
- calibrate across varied skin tones

### Phase M5 — Live Mobile Editor
- run/cache segmentation after image selection
- show editor after mask is ready
- continuous intensity slider
- interactive preview
- no network generation

### Phase M6 — Native Optimization
Only if measurements require it:
- move segmentation/rendering into typed Expo/native module
- use Core ML/Vision/Core Image/Metal as appropriate
- preserve React Native product layer

### Phase M7 — Save/Share/Library Migration
- export final image
- adapt existing save/share/local library
- store renderer parameters/version
- verify offline reopen behavior

### Phase M8 — Tan-Line Research
Separate experiment only after Add Tan succeeds:
- local skin-tone field
- detect anomalously light/dark regions
- infer surrounding target tone
- spatially smooth correction

Do not implement this inside M1–M7.

## First Codex Task
Read `AGENTS.md`, `ARCHITECTURE.md`, this plan, and `IMPLEMENTATION_STATUS.md`.

Then implement **Phase M1 only**.

Before modifying code:
1. inspect the current repository and identify reusable image-loading/normalization code;
2. identify candidate segmentation runtimes compatible with the current Expo/iOS setup;
3. propose the smallest benchmark harness;
4. do not modify the production editor flow yet.

After implementation:
- run `npm run verify`;
- generate benchmark artifacts from non-private test images if available;
- update `IMPLEMENTATION_STATUS.md`;
- report model/runtime used, inference time, mask limitations, files changed, and tests run.

## Decision Rule
If exposed-skin masks are consistently poor after reasonable model/refinement experiments, stop and reassess before building the renderer.

If masks are strong, continue with deterministic rendering rather than returning to generative image editing by default.
