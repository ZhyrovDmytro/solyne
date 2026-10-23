# AI_EDITING.md

## Purpose
This document defines Solyne's active mask-based image-editing behavior, quality requirements, and evaluation methodology.

The primary Add Tan feature uses AI/ML only to determine where editing is allowed. It does not regenerate the photograph.

## Active POC Pipeline

```text
original photo
  ↓
SkinMaskEngine
  ↓
raw exposed-skin mask
  ↓
MaskRefiner
  ↓
deterministic TanRenderer(original, mask, intensity)
```

The Phase M1 benchmark uses BodyPix body-part segmentation plus a secondary color-consistency gate as a replaceable baseline. The Expo Go test editor now runs the same selection concept once in an Expo DOM component, caches the mask, precomputes an OKLab-based tan transform, and updates the Canvas locally as the slider moves. This is a validation prototype, not the selected production runtime.

Kling, Replicate, and FLUX are legacy experiments retained temporarily for comparison. Their prompts, provider errors, latency, and cost are not part of the active Add Tan contract.

## Editing Contract

### Input
- immutable original image
- cached exposed-skin mask
- continuous tan intensity from 0 to 1
- optional tone parameters in later calibration work

### Output
A pixel-aligned edit of the original photograph in which only exposed human skin changes apparent pigmentation.

Every preview and export must derive from the original image plus the cached mask and current parameters. Never render from a previous tan result.

## Selection Contract
The mask should include:
- face, ears, and neck
- exposed shoulders, chest, and torso
- exposed arms, hands, and fingers
- exposed legs and feet
- all visible people during the POC

It should exclude:
- hair and eyebrows where practical
- eyes, teeth, lips, and makeup where practical
- clothes and swimwear
- jewelry and watches
- background

Body-part segmentation alone is insufficient because it can select clothing over an anatomical region. A skin-color heuristic alone is also insufficient across varied skin tones and lighting. Candidate models and refinement stages must be evaluated from visual artifacts.

## Rendering Contract
The tan renderer must:
- preserve source dimensions and pixel alignment;
- preserve source pixels outside the final mask;
- preserve lighting direction, local luminance, highlights, and shadows;
- preserve pores, freckles, scars, tattoos, and fine texture;
- adjust pigmentation relative to the visible starting skin tone;
- avoid a flat brown/orange overlay;
- avoid clipping shadows or highlights;
- update intensity without network access or new segmentation.

Prefer a controlled perceptual transform such as OKLab/Lab, or an equivalent calibrated pipeline. Do not move every source tone toward one fixed target color.

## Semantic Intensity Stops
The product may expose these labels as optional deterministic stops on the continuous slider:

### Natural
A subtle sun-kissed change relative to the starting tone.

### Golden
A noticeable but realistic honey-golden and light-brown tan without yellow, orange, or red cast.

### Bronze
A richer neutral-to-warm bronze result while preserving highlights and readable shadows.

### Deep
A deep but believable brown-bronze result. For already-dark skin, favor subtle bronze depth rather than forced darkening.

These labels map to renderer parameters. They do not initiate separate AI requests.

## Preservation Invariants
Preserve:
- identity and facial structure
- body shape, proportions, and pose
- hair, eyes, teeth, lips, and makeup
- clothing and swimwear
- tattoos and jewelry
- background, camera angle, and composition
- source lighting and natural skin texture

Geometry and non-skin content should remain exactly aligned because the active pipeline edits source pixels rather than synthesizing a new image.

## Common Failure Modes
Track explicitly:
- missing face, neck, hands, fingers, legs, or feet
- hair selected as skin
- clothes/swimwear selected as skin
- jewelry/watch contamination
- background contamination
- hard or haloed mask edges
- orange, red, grey, or flat skin
- clipped highlights or crushed shadows
- plastic or blurred texture
- tattoo loss or recoloring
- inconsistent face/body intensity
- excessive darkening of already-dark skin
- rerunning segmentation while moving the slider
- rendering from a previously rendered result

## Multiple People
Apply the tan consistently to clearly visible exposed skin for all visible people during the POC. Person selection is out of scope.

## Benchmark Dataset
Maintain a private/local set of roughly 30–50 representative, licensed images. Do not commit private photos.

Cover:
- selfie and face/shoulders
- upper and full body
- swimwear, shorts, and dresses
- crossed arms and hands near face
- fingers and feet
- long hair overlapping skin
- tattoos, watches, and jewelry
- warm indoor light, direct sun, and shade
- pale, already-tanned, and varied skin tones
- multiple people and partial/occluded bodies
- complex backgrounds and high-resolution sources

For each image retain inspectable artifacts:
- normalized original
- raw mask
- refined mask when available
- raw/refined overlays
- 0%, 25%, 50%, 75%, and 100% renders once the renderer exists
- runtime and dimensions

## Evaluation Scorecard
Score each relevant dimension from 1–5:
- face coverage
- neck/torso coverage
- arms/hands coverage
- legs/feet coverage
- hair exclusion
- clothes/swimwear exclusion
- background exclusion
- fine boundaries/fingers
- tattoo and jewelry handling
- multiple-person behavior
- tan realism
- texture and lighting preservation

Also record:
- engine/model/runtime and version
- device/backend
- image and mask resolution
- inference and refinement duration
- settings
- obvious failure notes

## Acceptance Gates
Before production rendering work, initial representative-mask targets are:
- at least 90% of obvious exposed skin captured;
- no more than 2% obvious non-skin contamination in important visible regions;
- no recurring severe hair, clothing, or background bleed;
- acceptable hands/fingers and face boundaries at normal phone viewing size.

After masks pass, renderer targets remain:
- at least 80% of representative images good enough to consider for marketing;
- fewer than 10% with obvious destructive edits.

Automated tests do not establish visual quality. Inspect benchmark artifacts and revise targets from measured evidence.

## Legacy Generative Comparison
The existing Kling/Replicate/FLUX code may remain during migration, but:
- it is not the default Add Tan architecture;
- it must not receive new primary-flow features;
- the active editor must not route new behavior through it after the mask pipeline is accepted;
- it may be removed only in a separately approved cleanup after the local pipeline proves viable.

Generative editing may later be evaluated for separate complex operations such as tan-line repair. It is not the fallback for basic Add Tan.

## Update Policy
Update this document when the segmentation runtime/model family, mask rules, refinement strategy, renderer behavior, semantic intensity mapping, benchmark methodology, or durable failure patterns change.

Record per-image benchmark observations separately rather than turning this document into a chronological log.
