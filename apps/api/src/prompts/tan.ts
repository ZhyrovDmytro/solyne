import type { TanPreset } from "@solyne/shared";

const BASE_PROMPT = `Use the supplied photograph as the sole visual source. This is a localized skin-tone correction of that exact photograph, not a new image or a restyled photograph.

Condition the correction on what is actually visible in the supplied photograph. For each visible person, preserve their original skin undertone and account for the existing scene illumination on every skin region: light direction and color, white balance, exposure, highlight and shadow gradients, cast shadows, reflections, and specular highlights. Change only the apparent tan pigmentation beneath that existing illumination. A skin area in shadow must remain in the same shadow; a highlight must retain the same position, shape, and brightness relationship. Do not neutralize the photograph's warm or cool lighting, add glow, change contrast, or relight the subject.

First identify the primary foreground person semantically, then distinguish their genuinely exposed body parts from hair, clothing, swimwear, accessories, and the background. Do not classify pixels as skin merely because they have a skin-like, beige, tan, brown, peach, or warm color. Apply the selected tan consistently only to exposed skin on that person's face, ears, neck, shoulders, torso, arms, hands and fingers, and legs and feet wherever those areas are visible. Do not alter other people. Use precise natural boundaries where skin meets hair, eyebrows, lips, eyes, teeth, clothing, swimwear, jewelry, and the background. Preserve tattoo ink, freckles, moles, makeup, pores, fine lines, and natural skin texture exactly; do not blur, airbrush, or cover them.

Preserve the original canvas dimensions and keep the supplied photograph pixel-aligned: do not crop, zoom, translate, rotate, reframe, reconstruct, extend, or move any element. Preserve the exact identity, facial features, face shape, body shape, proportions, pose, hair, eyes, lips, teeth, clothing, swimwear, jewelry, tattoos, background, camera angle, composition, focus, depth of field, grain, and lighting. Keep all non-skin pixels visually identical to the supplied photograph.

Do not reshape, beautify, smooth, regenerate, or retouch the person. Do not recolor hair, clothing, objects, or the background. Avoid orange, red, grey, oversaturated, muddy, flat, or plastic-looking skin. The result must look like the same unedited photograph of the same person, taken at the same instant, with only their natural tan level changed.`;

const PRESET_PROMPTS: Record<TanPreset, string> = {
  natural:
    "Create a subtle, understated sun-kissed tan relative to each person's visible starting skin tone. Add only a small amount of natural warm-brown pigmentation, roughly one shade deeper, while keeping fair skin recognizably fair and darker skin recognizably the same tone. Preserve the source undertone; do not introduce obvious yellow, orange, or red color.",
  golden:
    "Create a noticeable but realistic warm golden tan relative to each person's visible starting skin tone, approximately two natural shades deeper. Add balanced honey-golden and light-brown pigmentation while preserving the source undertone and the photograph's existing color temperature. The result should look naturally sun-tanned, never yellow, orange, red, or spray-tanned.",
  bronze:
    "Create a clearly richer bronze tan relative to each person's visible starting skin tone, approximately three natural shades deeper. Use controlled neutral-to-warm brown bronze pigmentation with moderate saturation. Preserve the source undertone, luminous highlights, and readable shadow detail; do not make the skin red, orange, grey, muddy, or uniformly dark.",
  deep:
    "Create the strongest tan in this set: a deep but believable brown-bronze tan relative to each person's visible starting skin tone. Preserve the source undertone and keep highlights luminous and shadows detailed instead of crushing them. For already-dark skin, add subtle warm bronze depth and radiance rather than forcing a substantially darker or uniform target. Never make the skin orange, red, grey, muddy, or unnaturally saturated.",
};

export function buildTanPrompt(preset: TanPreset): string {
  return `${BASE_PROMPT}\n\nTan level: ${PRESET_PROMPTS[preset]}`;
}
