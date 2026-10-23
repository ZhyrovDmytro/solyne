# SEGMENTATION_BENCHMARK.md

## Purpose
This document records durable segmentation-benchmark setup and checkpoint conclusions. Per-image scores for private/local datasets should remain outside git.

## M1 Baseline
- Engine: `@tensorflow-models/body-pix` 2.2.1
- Model: MobileNetV1, multiplier 0.75, stride 16, 2-byte weights
- Backend: TensorFlow.js CPU in the Node development harness
- Input: orientation-normalized sRGB, downscaled to a configurable maximum edge (1024 px by default)
- Selection: BodyPix body-part candidate region intersected with a broad YCbCr/RGB color-consistency score
- Outputs: normalized original, raw grayscale mask, mask overlay, and JSON diagnostics

The model package declares Apache-2.0 licensing. This records the development dependency only; production model/runtime licensing must be reviewed again when M2 selects a shipping candidate.

## Command

Keep representative, licensed/non-private photos under the git-ignored `test-images/` directory:

```bash
npm run benchmark:mask -- \
  --input test-images/photo-01.jpg \
  --input test-images/photo-02.jpg
```

Optional flags:
- `--output <directory>` (default: `benchmark-output`)
- `--max-edge <pixels>` (default: 1024)

The first run needs network access to download BodyPix weights. Photo bytes are read locally by the harness and are not uploaded by Solyne code; the TensorFlow model loader independently downloads public weights.

## Public Fixture Check
The harness was exercised with TensorFlow's public `body-segmentation/test_data/portrait.jpg` fixture:
- source: 820×1024
- normalized benchmark size: 410×512
- measured inference: about 1.1 seconds on the development Mac CPU backend
- selected-pixel ratio: 9.65%

This timing is a harness sanity check, not an iPhone performance claim.

## Observed Failures
Visual inspection showed:
- most face and hand skin was selected;
- the first permissive color gate selected much of the dark suit and was tightened;
- the calibrated mask still selected hair with the face;
- small shoulder/clothing/accessory regions remained selected;
- the raw mask has no feature exclusions, connected-component cleanup, morphology, or edge-aware feathering.

Conclusion: the M1 harness works and produces inspectable evidence, but this single BodyPix baseline does not establish the production mask gate.

## M2 Checkpoint
Use the same 30–50-image dataset and scorecard for BodyPix and at least one additional viable segmentation approach. Record model/runtime, backend/device, dimensions, timing, licensing, coverage, contamination, boundaries, and failure notes. Do not migrate the production editor until the checkpoint is reviewed.
