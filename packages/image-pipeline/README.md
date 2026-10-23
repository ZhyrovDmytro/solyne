# Solyne image-pipeline benchmark

This package contains the framework-independent image-pipeline contracts and the Phase M1 development benchmark. It is not imported by the production editor yet.

## Run the raw-mask benchmark

Place non-private/licensed photos under the git-ignored `test-images/` directory, then run:

```bash
npm run benchmark:mask -- --input test-images/example.jpg
```

Repeat `--input` to process more photos. Results are written to the git-ignored `benchmark-output/` directory:

- `original.jpg`
- `raw-mask.png`
- `raw-mask-overlay.jpg`
- `benchmark.json`

The first run downloads the Apache-2.0 BodyPix model weights. Inference uses TensorFlow.js' CPU backend and is a benchmark implementation, not the selected production iOS runtime.

## Current limitations

BodyPix supplies anatomical body-part segmentation, not exposed-skin segmentation. The M1 engine intersects those regions with a deliberately broad color-consistency score. This is useful for producing inspectable baseline artifacts, but it will miss skin under difficult lighting and may include skin-colored clothing. It must be compared with another model/runtime in M2 before production integration.
