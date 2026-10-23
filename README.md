# Solyne

Solyne is a photo editor that creates a natural-looking tan while preserving the original person and photograph.

## Membership preview

The home screen now includes a public before/after sample and Solyne Plus plan selection. Personal editing, archived results, export and the legacy API fail closed until store billing and server verification are connected. Prices are illustrative and this build takes no payments. See [flow, pricing research and integration requirements](docs/MONETIZATION.md).

## Active architecture

Solyne is migrating from generative image editing to an **AI-assisted skin mask + deterministic local tan renderer**.

```text
photo
  ↓
exposed-skin segmentation
  ↓
mask refinement
  ↓
deterministic tan renderer
  ↓
live intensity preview
  ↓
save/share
```

The AI/ML component selects **where** skin can be edited. It does not regenerate the photo for the primary Add Tan feature.

## Why the architecture changed
The earlier generative-provider POC proved that cloud image editing can create a tan, but it also introduced:
- long generation latency
- per-edit cost
- non-deterministic intensity
- possible changes to identity/background/clothing
- imperfect before/after pixel alignment

The new approach should allow:
- exact source-image preservation outside the skin mask
- continuous live tan intensity
- no new AI request for slider changes
- near-zero marginal Add Tan cost when fully on-device
- offline/private processing if the final implementation remains local

## Repository
This is an npm-workspaces monorepo containing the Expo application, existing Express generative POC, and shared code.

The Express cloud-edit path is currently **experimental comparison code**. OpenAI GPT Image is its default provider; older Kling and Replicate adapters remain temporarily for comparison. This cloud path is not the primary live-mask Add Tan flow.

## Requirements
- Node.js 22 or newer
- npm 11 or newer
- Xcode + iOS simulator for the initial mobile target
- physical iPhone strongly recommended for segmentation/performance validation

## Install

```bash
npm install
```

## Run the existing app

```bash
npm run dev:mobile
```

The existing API can still be run for legacy comparison work:

```bash
npm run dev:api
```

but it is not intended to be required by the new primary Add Tan pipeline.

## Verify

```bash
npm run verify
```

This should run strict TypeScript checks, ESLint, and automated tests across the workspaces.

## Current development priority

Do **not** start by polishing the live editor.

The M1 BodyPix baseline harness is implemented. M2 now has a second candidate: MediaPipe SelfieMulticlass with facial landmark exclusions. The next milestone is comparing both across 30–50 representative photos.

The current Expo Go editor also includes a validation prototype: it detects semantic face/body skin and facial details once inside an Expo DOM component, caches the mask, and updates a deterministic tan preview as the slider moves. It does not call the legacy `/api/v1/tan` route. Use **Refine selection** to inspect the mask, add or remove areas, undo strokes, or reset. **Show original** compares without losing settings. Export uses lossless PNG at the imported photo’s normalized resolution (up to 2048px). First use needs internet for pinned model/runtime downloads. See [selection implementation](docs/SKIN_SELECTION.md).

```text
test photo
  ↓
SkinMaskEngine
  ↓
raw mask
  ↓
overlay
```

Test 30–50 representative photos and inspect:
- face/neck coverage
- arms/hands/fingers
- legs/feet
- hair boundaries
- clothes/swimwear exclusion
- tattoos
- jewelry
- multiple people
- varied skin tones
- difficult lighting/backgrounds

Run the current baseline with:

```bash
npm run benchmark:mask -- --input test-images/example.jpg
```

Artifacts are written under the git-ignored `benchmark-output/` directory. Only after mask quality is strong should the project invest heavily in the deterministic tan renderer and live slider.

## Intended mobile architecture

```text
React Native / Expo
       │
       ▼
typed image-engine boundary
       │
       ├── segmentation
       ├── mask refinement
       └── tan rendering
```

If required by performance/model support, the iOS implementation may use Core ML/Vision/Core Image/Metal behind that boundary. The app itself remains React Native.

## Legacy generative POC
OpenAI GPT Image is the default cloud comparison provider. Kling and Replicate integration may remain temporarily for side-by-side comparison. Do not treat cloud generation as the current product architecture and do not expose the unauthenticated local API publicly.

Configure the comparison API with `OPENAI_API_KEY`; the credential must remain on the backend. GPT Image returns image bytes, which Solyne archives locally rather than relying on a temporary hosted provider URL.

See:
- `ARCHITECTURE.md`
- `IMPLEMENTATION_PLAN.md`
- `IMPLEMENTATION_STATUS.md`
- `LAUNCH_READINESS.md`

## Public website

The static Solyne landing page and Privacy, Terms and Support pages live in
[`apps/website`](apps/website/README.md). Preview with
`python3 -m http.server 4173 --directory apps/website` and publish that directory
on a static host. Legal pages remain drafts until operator details are completed.
