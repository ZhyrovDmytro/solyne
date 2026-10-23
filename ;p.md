# AGENTS.md

## Project
Solyne is an intentionally narrow React Native / Expo photo-editing app for creating a realistic tan while preserving the original photograph.

The active POC architecture is **AI-assisted skin segmentation + deterministic local image processing**, not generative image regeneration.

Primary workflow:

`select/take photo → detect exposed skin → preview/refine mask → adjust tan live → compare before/after → save/share`

The current engineering goal is to prove that exposed-skin selection is accurate enough to support a premium real-time tan editor.

## Read Before Substantial Changes
Read:
- `IMPLEMENTATION_PLAN.md`
- `ARCHITECTURE.md`
- `IMPLEMENTATION_STATUS.md`
- `LAUNCH_READINESS.md`
- `docs/PRODUCT.md` and `docs/AI_EDITING.md` if present

If documentation conflicts, the newer mask-based architecture in `ARCHITECTURE.md` is authoritative. Report meaningful conflicts rather than silently reviving the old generative flow.

## Package Manager
Use npm and the repository lockfile.

Do not introduce pnpm, Yarn, Bun, Nx, Turborepo, or other workspace tooling unless explicitly requested.

## Core Stack
Application:
- React Native
- Expo
- TypeScript
- Expo Router

Image pipeline:
- semantic/human skin segmentation
- mask refinement
- deterministic color/tone processing
- on-device execution where practical

Native implementation is allowed behind a narrow Expo/native module boundary when required for Core ML, Vision, Core Image, Metal, or equivalent high-performance image processing.

The existing Express/Kling/Replicate generation path is legacy experimental code. Do not extend it for the primary Add Tan flow unless explicitly requested.

## Architectural Rules
- The original photo is immutable.
- AI/ML decides **where editing is allowed**; it should not regenerate the photograph for the primary Add Tan feature.
- Tan strength/color changes must be deterministic operations applied only through the final skin mask.
- Changing tan intensity must not trigger a network request or a new AI generation.
- Preserve source pixels outside the mask.
- Preserve texture, highlights, shadows, freckles, tattoos, and local luminance structure inside the mask as much as possible.
- Keep screens thin; business/image-processing logic belongs in services/hooks/modules.
- Keep segmentation and tan rendering behind explicit interfaces so models/renderers can be benchmarked independently.
- Prefer on-device inference and rendering when quality/performance are sufficient.
- Do not upload user photos for the primary flow merely because a backend already exists.

## Scope Constraints
Do not add unless explicitly requested:
- authentication/accounts
- database/cloud history
- subscriptions/payments
- analytics SDKs
- generic AI editing
- face/body reshaping
- background editing
- social features
- GraphQL/microservices/Kubernetes
- new generative providers for the primary Add Tan path

## TypeScript
Use strict TypeScript. Avoid `any`. Isolate native/external unsafe data at boundaries. Prefer explicit domain types and discriminated unions.

## React Native / Native Boundary
- React Native owns navigation, product UI, session state, library, save/share, and comparison UX.
- Native code should be introduced only where it materially improves segmentation/rendering/performance.
- Native APIs must be wrapped behind a small typed interface; UI code must not depend on Core ML/Core Image/Metal details.
- Keep Android portability possible even if the first optimized implementation is iOS-first.
- Do not block the segmentation POC on a full cross-platform native implementation.

## Skin Segmentation Invariants
The mask should include exposed human skin:
- face/ears/neck
- shoulders/torso where exposed
- arms/hands/fingers
- legs/feet where exposed

It should exclude:
- hair/eyebrows where practical
- eyes/teeth/lips where practical
- clothes/swimwear
- jewelry/watches
- background

Tattoos require special care: the tan operation should preserve tattoo detail rather than erase or recolor it unnaturally.

Multiple people may all be included in the POC; person selection is out of scope.

## Tan Rendering Invariants
The renderer changes apparent pigmentation, not identity or geometry.

It must:
- preserve original dimensions and pixel alignment
- preserve lighting direction and local shading
- preserve texture
- avoid flat brown/orange overlays
- avoid clipping highlights/shadows
- support continuous intensity without recomputing segmentation
- render from the original image + mask, never from a previously rendered result

Prefer perceptual color-space operations (for example OKLab/Lab or an equivalent controlled transform) over naive RGB tinting.

## Generative AI
Kling/Replicate/FLUX code may remain temporarily for comparison and migration safety, but:
- it is not the active architecture for Add Tan;
- do not add features to it unless explicitly requested;
- do not make launch readiness depend on a generative provider if the local pipeline succeeds;
- remove/deprecate it after the mask pipeline reaches acceptance quality.

Generative editing may later be evaluated separately for complex features such as difficult tan-line repair, but it is not the default fallback.

## Testing and Verification
Before completing a task, run relevant checks. Target root command:

```bash
npm run verify
```

For mask/rendering work, automated correctness is insufficient. Produce visual benchmark artifacts from the local test dataset when possible:
- original
- raw mask
- refined mask
- 25% tan
- 50% tan
- 75% tan
- 100% tan

Do not claim visual quality from tests alone.

## Definition of Done
A mask-pipeline task is complete only when:
1. it matches the requested scope;
2. typecheck/lint/tests pass;
3. no unrelated changes are introduced;
4. benchmark outputs can be inspected;
5. `IMPLEMENTATION_STATUS.md` is updated for milestone work;
6. limitations are reported.

Current POC acceptance flow:

`select real photo → segment exposed skin once → move tan slider live → compare → save`

## Git Discipline
Keep diffs focused. Do not rewrite unrelated legacy provider code during mask experiments. Inspect `git diff` and `git status` before finishing. Never commit private test images, model secrets, or generated benchmark sets containing private photos.

## Engineering Style
Prefer the smallest experiment that disproves or validates the key risk.

Right now the key risk is **mask quality**, not backend architecture, monetization, or generative-provider integration.
