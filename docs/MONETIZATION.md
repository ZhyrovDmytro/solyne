# Solyne Plus: purchase flow and pricing hypothesis

## Decision (16 October 2026)

Use a free public sample, then a hard paywall before any personal-photo rendering. Offer annual and monthly membership without a free trial. Start pricing experiments at US $29.99/year and $5.99/month; annual is the initial selection. These are hypotheses, not a claim that the optimum price has been established. The UI labels them illustrative until store offerings are connected.

Flow: home sample comparison → choose/take photo → original-photo thumbnail on paywall → choose plan → store confirmation → server verifies paid entitlement → personal editor → compare/refine → save. Closing the paywall keeps the original selection in session. Home shows a resume card, supports choosing another photo, and can clear the current selection without payment. Cancelled, pending, failed, unverified and unavailable purchases must never unlock rendering. Restore must verify an existing purchase before granting access.

The current build stops at the paywall. Purchase and restore report unavailability. There is no test unlock or local paid flag. Protected routes cover editor, processing, result and saved-edit views. File preparation, archive reads/writes, saving and generation enforce denial independently. The legacy API denies all tan requests by default before upload parsing or provider execution. Existing pipeline tests inject test-only authorization; separate access tests exercise actual denial.

## Evidence and design references

- [RevenueCat, State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps): reports 10.7% versus 2.1% download-to-paid conversion for hard paywalls versus freemium, with similar year-one retention. This is observational across different products, not causal proof or a Solyne conversion forecast. It motivates an initial hard-paywall experiment.
- [Remini](https://remini.ai/): show a visual transformation and keep the first action understandable. Borrow the image-first hierarchy, not its branding or subscription mechanics.
- [Facetune retouch](https://www.facetuneapp.com/features/photo-retouch): direct photo selection and understandable adjustment controls. Keep Solyne focused on one job instead of a large tool catalogue.
- [Photoroom pricing](https://www.photoroom.com/pricing): connect each plan to understandable benefits. Solyne does not currently need complex AI credits because its primary renderer is local.

The annual/monthly mix and no-trial decision are product judgments: predictable cost, a short commitment for occasional use, and compliance with the requirement that personal results only exist after payment. Avoid weekly billing, fake discounts, countdowns, fabricated reviews, and trial language without an actual trial. The home comparison is explicitly an AI-generated marketing sample; it is not evidence of production mask quality.

## Service integration requirements

Use store-localized product prices and billing periods rather than charging from design constants. Connect native store purchases through RevenueCat, then verify paid access on a trusted server. See [Trusted Entitlements](https://www.revenuecat.com/docs/customers/trusted-entitlements). Restore and app foregrounding must refresh verification. Pending payment, cancellation, expiration, revocation and refund require explicit handling. Never accept a client-supplied paid boolean or trust a successful button press.

Before opening the API: authenticated ownership checks on every job/result; signed webhook verification and idempotency; bounded per-user requests, concurrency and upload dimensions; private object storage and short-lived download grants; no raw image/provider URLs in logs or analytics; deletion/retention rules; real privacy and merchant terms. The injected server middleware boundary is currently unwired and must verify identity, payment and resource ownership together.

A fully local renderer cannot provide an absolute guarantee against a modified client, a rooted device or extraction of previously saved photos. For the strictest requirement, keep the original and all rendering on a trusted backend until payment is verified, then serve only owner-authorized results. Screenshot restrictions and hidden buttons are not authorization. Never deliver personal adjusted pixels before payment, even blurred or watermarked: the client already has them. Public marketing samples are intentionally available to everyone.

## Experiments after billing is connected

Measure paywall view → plan selection → purchase initiation → verified payment → first successful save. Evaluate revenue per install, renewal, refund rate and time to first saved edit, not just paywall clicks. Do not include photo content or image URLs in events. Test annual versus monthly prominence and price in controlled cohorts, with clear terms throughout. Validate store cancellation, pending payment, restore, refund, replayed callbacks and cross-account access before launch. Conversion improvement and physical-device behavior remain unproven until measured.

## UX completion and verification

Checkout stays visible beneath scrolling plan content on standard screens. Short screens and larger accessibility text use one scrollable layout so controls cannot be trapped below a fixed footer. Export copy explicitly discloses the current 2048px maximum. The system photo picker avoids requesting broad library permission, consistent with [Expo ImagePicker documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/); camera permission remains requested only on the camera action. A synchronous selection lock prevents duplicate pickers.

Automated checks cover photo selection/cancellation, denied camera access, non-finite dimensions, resizing without upscaling, resuming the original through the paywall, clearing a selection, duplicate taps, cancelled replacement selection, and unpaid generation/archive/export denial. Native picker dialogs were not automated. Real store purchase states, device screenshots/recording behavior, segmentation quality and physical-device accessibility remain launch validation work.
