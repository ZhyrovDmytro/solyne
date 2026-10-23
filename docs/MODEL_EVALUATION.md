# Model Evaluation Notes

Keep raw provider observations here rather than turning `AI_EDITING.md` into an experiment log. Do not commit source photos, generated photos, temporary provider URLs, or identifying filenames.

## Smoke 001 — 2026-09-04

- Provider/model: Replicate / `black-forest-labs/flux-kontext-pro`
- Preset: Golden
- API outcome: success
- API duration: 11.3 seconds
- Input: single-person outdoor beach photograph, strong directional sunlight, substantial exposed skin
- Technical result: valid HTTPS JPEG output; composition and subject were broadly preserved on visual inspection
- Quality observation: skin became substantially darker and redder than the Golden intent, reading closer to the Deep preset
- Follow-up: retain this image in the private benchmark set and compare prompt-strength changes across multiple representative photos before changing preset semantics

This smoke test proves transport and adapter behavior, not model acceptance. No conclusion about the 80% quality target can be drawn from one photograph.
