# PRODUCT.md

## Product
**Working name:** Solyne

**Solyne is an AI-assisted photo editor that creates a natural-looking tan with an exposed-skin mask and deterministic local rendering while preserving the original person and photograph.**

## Product Thesis
A narrow visual utility can be easier to understand, advertise, and validate than a broad photo editor.

The POC exists to answer:

> Can we select exposed skin accurately enough to produce a convincing, interactive tan edit without regenerating the photograph?

## Primary User Job
> Make my skin look naturally and evenly tanned in this photo without making the photo look edited.

## Core Workflow

The October 2026 monetization update supersedes the original free POC flow: explore the public sample → select an original photo → choose Plus plan → complete verified payment → edit/refine/compare → save. Personal rendering and saved results remain locked while billing is unconnected. See [monetization decisions](MONETIZATION.md).

Post-payment editing:
1. Launch app.
2. Take a photo or choose one from library.
3. Preview original.
4. Detect exposed skin once.
5. Open the editor with the cached mask.
6. Adjust tan intensity live.
7. Compare original and result.
8. Save/share or adjust the intensity again.
9. Reopen any saved edit, compare before/after, and save it to Photos again.

## Tan Presets
- Natural
- Golden — default
- Bronze
- Deep

The primary control is a continuous 0–100% intensity slider. These preset names may remain as semantic stops mapped to deterministic parameter values; they do not trigger separate AI generations.

## Product Priorities
In order:
1. believable result
2. preservation of the original person/photo
3. simple and obvious UX
4. interactive slider response after segmentation
5. local/offline behavior when verified by the shipping implementation
6. visual polish
7. feature breadth

## UX Principles
- Image-first.
- The benefit should be understandable within seconds.
- Minimize decisions.
- Avoid onboarding unless testing proves it is necessary.
- Keep saved edits private to the user's device until a cross-device account system is specified.
- Do not request permissions before the relevant user action.
- The result screen and before/after interaction are the hero experience.

## Initial Screens

### Home
Immediate actions:
- Take photo
- Choose from library

### Editor
- selected image
- segmentation state before controls become available
- continuous tan-intensity slider
- optional Natural/Golden/Bronze/Deep semantic stops
- mask preview/refinement affordance if benchmark evidence shows it is needed
- Change Photo

### Processing
- selected image remains visible
- useful exposed-skin detection copy
- no fake percentage progress
- no provider, upload, rate-limit, or generation language in the active local flow

### Result
- interactive before/after comparison
- Save
- Share
- adjust intensity
- preserve the photograph's natural aspect ratio without cropping or stretching
- prevent screenshots and screen recording while the result is visible

### Your Edits
- show every successfully archived edit stored on this phone
- reopen the original and edited image for before/after comparison
- save the edited image to Photos again
- delete a saved original/edit pair from Solyne

## POC Non-Goals
Do not build:
- general beauty editing
- face/body reshaping
- background editing
- social feed
- cross-device accounts and sync (requires a separate product decision)
- credits
- analytics stack
- push notifications
- AI chat

## Later Product Hypotheses
Do not implement these during the initial POC, but preserve them as research directions:
- Fix Uneven Tan
- Remove Tan Lines
- user-selectable person in group photos
- optional credits for future cloud tools

## POC Success Criteria

### Output Quality
Initial mask gate:
- at least 90% of obvious exposed-skin area captured on representative photos;
- no more than 2% obvious non-skin contamination in important visible regions;
- no recurring severe clothing, hair, or background bleed.

For accepted masks, target at least 80% of representative renders producing a result good enough to consider using in marketing and fewer than 10% with obvious destructive edits.

### Performance
Aim for segmentation within 2 seconds on a recent physical iPhone and interactive slider updates after the mask is cached.

### Economics
The target marginal server/AI cost for Add Tan is $0 when segmentation and rendering are fully on-device.

### Acceptance Flow
The POC is not complete until this works on a real photo:

`select photo → segment exposed skin once → adjust tan live → compare → save`

## Product Change Policy
Update this file when:
- core workflow changes;
- target user/job changes;
- a feature becomes an accepted product requirement;
- a non-goal becomes in-scope;
- success criteria change.

Do not update it for implementation details.
