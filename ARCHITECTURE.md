# ARCHITECTURE.md

## Purpose
This is the technical source of truth for Solyne's active POC architecture.

**Architecture pivot:** the primary Add Tan feature no longer regenerates the image with Kling/FLUX. Solyne should detect exposed skin once, create/refine a mask, and apply a deterministic local tan transform to the original pixels.

The existing Express + generative-provider implementation is retained only as experimental comparison code until the new pipeline is validated. OpenAI GPT Image is now the default comparison provider; Kling and Replicate adapters remain legacy alternatives.

## System Context

```text
┌──────────────────────────────────────────┐
│            Expo React Native             │
│                                          │
│  Select photo                            │
│       ↓                                  │
│  SkinMaskEngine                          │
│       ↓                                  │
│  raw mask → MaskRefiner → final mask     │
│       ↓                                  │
│  TanRenderer(original, mask, intensity)  │
│       ↓                                  │
│  live preview / before-after / save      │
└──────────────────────────────────────────┘
```

Target production direction on iOS:

```text
React Native product/UI layer
        │
        ▼
typed native module boundary
        │
        ├── Core ML / Vision (segmentation)
        └── Core Image / Metal (mask + tan rendering)
```

A pure-JS/prototype implementation is acceptable for benchmarking if it reaches useful quality quickly. Native optimization comes after the mask hypothesis is proven.

## Architectural Principle
Separate **selection** from **editing**:

```text
AI/ML:      Which pixels are exposed skin?
Renderer:   How should those pixels change?
```

The segmentation model does not decide the final tan color. The renderer does not decide which pixels are skin.

This separation makes each layer independently testable and replaceable.

## Repository Direction

Existing repository structure may remain during migration:

```text
apps/
  mobile/
  api/              legacy generative POC; not required for primary local flow
packages/
  shared/
  image-pipeline/   typed contracts + development segmentation benchmark
docs/
```

The M1 benchmark uses a dedicated `packages/image-pipeline` workspace so its Node/TensorFlow dependencies cannot leak into the Expo bundle. Product integration may add mobile-facing adapters under:

```text
apps/mobile/src/features/tan/
  domain/
  segmentation/
  mask/
  rendering/
  benchmark/
```

Do not restructure the whole repository merely to accommodate the experiment.

## Core Interfaces

Conceptually:

```ts
export interface SkinMaskEngine {
  segment(input: SkinMaskInput): Promise<SkinMaskResult>;
}

export interface MaskRefiner {
  refine(input: MaskRefineInput): Promise<RefinedMask>;
}

export interface TanRenderer {
  render(input: TanRenderInput): Promise<TanRenderResult>;
}
```

Domain concepts should include:
- `SkinMask`
- `TanIntensity` (continuous 0...1)
- optional `TanTone`
- segmentation confidence/diagnostics where useful

Provider/model-specific types must remain behind `SkinMaskEngine`.

## Image Lifecycle
1. User selects/takes a photo.
2. Normalize orientation and working resolution without mutating the source.
3. Run skin segmentation once.
4. Refine/feather the mask.
5. Cache the mask for the editing session.
6. Render tan previews from **original + cached mask + parameters**.
7. Slider changes update rendering only; segmentation is not rerun.
8. Export full-quality result from original + mask + chosen parameters.
9. Save/archive locally as desired.

Never chain rendered outputs:

```text
correct:
original + mask + 0.25
original + mask + 0.50
original + mask + 0.75

wrong:
original -> 0.25 result -> 0.50 result
```

## Segmentation Requirements
The key POC risk is exposed-skin masking.

Mask should include visible skin on:
- face, ears, neck
- shoulders/chest/torso when exposed
- arms, elbows, hands, fingers
- legs, knees, feet

Mask should exclude:
- hair
- clothing/swimwear
- eyes/teeth/lips where practical
- jewelry/watches
- background

Important edge cases:
- hair crossing shoulders/face
- bikini straps
- hands near face
- fingers
- crossed arms
- tattoos
- watches/bracelets
- multiple people
- occlusion
- complex backgrounds
- warm/cool lighting
- varied skin tones

Use semantic/human parsing, body-part segmentation, skin probability, face landmarks, or combinations thereof as needed. Do not lock the architecture to one model before benchmarking.

## Mask Refinement
Raw model output is not necessarily the production mask.

Refinement may include:
- resize/alignment to source image
- confidence thresholding
- morphological open/close
- hole cleanup
- edge-aware feathering
- guided/bilateral refinement
- exclusion masks for hair/clothes/face features
- optional skin-color consistency checks

Avoid large feather radii that bleed tan into clothing/background.

## Tan Rendering
The tan transform is deterministic and should preserve source texture and lighting.

Prefer controlled transforms in a perceptual color space such as OKLab/Lab, or an equivalent color pipeline, rather than a flat brown overlay.

Conceptually:

```text
source RGB
   ↓
perceptual representation
   ↓
adjust pigmentation parameters under mask
   ↓
preserve local luminance/texture
   ↓
blend with refined alpha mask
   ↓
output
```

Parameters may include:
- intensity 0...1
- warmth
- chroma
- target lightness curve
- optional tone family

The exact transform must be calibrated empirically across varied skin tones. Never use one fixed target skin color.

## Live Editing
After segmentation, intensity changes should feel immediate.

Current validation adapter: an Expo DOM component runs MediaPipe SelfieMulticlass and Face Landmarker in the WebView on CPU. The semantic mask excludes hair/clothing/accessories, confidence-gates skin, removes eye/mouth polygons, and feathers inward. Manual add/remove strokes, undo and reset modify the cached mask. Source-relative OKLab rendering remains local, with PNG export at normalized source resolution (up to 2048px). The pinned JS/WASM and models load over HTTPS; this is not yet a verified offline or production-native runtime. See `docs/SKIN_SELECTION.md`.

Target:
- no network request
- no new AI inference for each slider movement
- interactive preview, ideally 60 FPS on supported devices
- full-resolution export may be slower than preview

Use a downscaled preview texture if needed, then render export at source/normalized export resolution.

## Tattoos and Texture
Do not erase tattoo detail. A tan is a pigmentation change over skin; tattoo structure should remain visible.

The renderer should preserve:
- pores
- freckles
- scars
- tattoos
- highlights
- shadows
- reflections

## Tan Lines / Uneven Tan
These are **not equivalent to Add Tan**.

Future `Even Tan` / `Remove Tan Lines` requires:
- skin mask
- local tone analysis
- detection of anomalously lighter/darker skin regions
- target tone estimation from surrounding skin
- spatially smooth correction

Do not overload the Add Tan POC with automatic tan-line detection until the basic mask pipeline succeeds.

## Backend
The backend is no longer required for the primary Add Tan flow if segmentation/rendering run on-device.

Existing Express/OpenAI/Kling/Replicate code may remain during migration for:
- historical comparison
- benchmark experiments
- possible future specialized operations

Do not upload photos to it for the active Add Tan path.

If the local pipeline succeeds, plan removal/deprecation of provider-specific generation infrastructure.

## Privacy
Preferred end state: original photos and masks stay on-device for Add Tan.

This materially simplifies privacy and launch architecture, but privacy claims must reflect the shipped implementation. Do not claim on-device processing while any active code path uploads the image.

## Performance Targets
POC targets:
- segmentation: ideally <= 2 seconds on a recent iPhone; measure rather than assume
- slider response: interactive, target 60 FPS
- no per-slider network cost
- no marginal AI-generation cost for Add Tan
- export: fast enough for normal consumer photo workflow

Quality outranks these targets during the initial mask benchmark.

## Benchmark Gate
Before investing in production rendering/native optimization, test 30–50 representative images.

For each image produce:
- original
- raw mask overlay
- refined mask overlay
- representative tan renders

Score 1–5:
- face skin coverage
- body skin coverage
- hair exclusion
- clothing/swimwear exclusion
- hands/fingers
- boundary quality
- tattoo preservation
- multiple-person handling
- tan realism
- texture/lighting preservation

The primary gate is mask quality. If the mask is not reliable, evaluate another segmentation approach before polishing the app.

## Architecture Decisions

### ADR-001 — Expo React Native
Status: Accepted

React Native/Expo remains the product layer.

### ADR-002 — Generative Image Editing Is No Longer Primary
Status: Superseded

Generative editing providers proved useful for experimentation but introduce latency, cost, non-determinism, and subject/background drift. OpenAI GPT Image replaces Kling as the default cloud comparison provider, but cloud generation is not the primary Add Tan architecture.

### ADR-003 — AI-Assisted Segmentation + Deterministic Rendering
Status: Accepted

Use AI/ML for selection and deterministic image processing for the tan.

### ADR-004 — On-Device First
Status: Accepted

Prefer on-device segmentation/rendering when benchmark quality permits. Do not introduce a server dependency without a concrete quality/performance reason.

### ADR-005 — Original Image Is Immutable
Status: Accepted

All previews/exports derive from the original plus mask and parameters.

### ADR-006 — Continuous Tan Intensity
Status: Accepted

Unlike the generative architecture, the new renderer should support a real continuous slider because intensity changes are deterministic and cheap.

### ADR-007 — Narrow Native Module Boundary
Status: Accepted

Use native iOS image/ML APIs when they materially improve quality or performance, but keep them behind typed interfaces so React Native remains the app layer.

### ADR-008 — Segmentation Model Is Replaceable
Status: Accepted

Do not couple UI/domain code to one ML model or runtime.

### ADR-009 — Tan-Line Repair Is a Separate Pipeline
Status: Accepted

Do not treat tan-line removal as a simple Add Tan preset.

## Change Policy
Update this document when the segmentation runtime/model family, native boundary, renderer strategy, image lifecycle, or local/server responsibility materially changes.
