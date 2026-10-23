# Solyne launch readiness

## Architecture status
Solyne is migrating from a cloud generative-image POC to an **on-device-first skin segmentation + deterministic tan-rendering pipeline** for the primary Add Tan feature.

The launch requirements below must be evaluated against the code path that actually ships.

## Already useful from the current checkout
- The app has an on-device edit library concept with original/edit pairs.
- Users can reopen edits, compare before/after, save to Photos, and delete local pairs.
- Existing generative-provider code is isolated enough to remain temporarily for comparison.

## Required before other people use the mask-based Add Tan flow

1. **Validate local processing claims.** Confirm that the production Add Tan path does not upload the original image, mask, or rendered result before describing the feature as on-device/private/offline.

2. **Privacy review.** Publish an accurate privacy notice describing actual photo access, local storage, diagnostics, crash reporting, and any remaining network processing. Address photos containing other people and minors. Do not inherit old provider-upload disclosures if the shipping path no longer uploads photos.

3. **Model/runtime licensing.** Verify that the chosen segmentation model, weights, conversion format, and runtime permit commercial mobile distribution. Record required notices/attribution.

4. **Production security.** If Add Tan is fully local, the legacy unauthenticated Express/Kling service must not be exposed merely because it remains in the repository. Remove it from the production build/deployment or secure any server features that remain.

5. **Local data lifecycle.** Define what Solyne stores in its app container (original copy, mask, rendered edit, metadata), how users delete it, behavior on uninstall, and what happens under low-storage conditions.

6. **Release validation.** Test segmentation, live slider, export, archive, before/after, repeat Save, delete, offline reopen, app restart, memory pressure, and low storage on supported physical devices and representative photos.

7. **Generative features, if retained later.** Any future cloud/generative feature must independently satisfy provider authorization, data-processing/privacy, retention/deletion, transfer, abuse protection, HTTPS, and operational requirements. Do not let those legacy requirements block a fully local Add Tan launch unless the provider path actually ships.

## Important product claim rule
Do not claim:
- "100% on-device"
- "photos never leave your phone"
- "offline"
- "zero AI server processing"

until the production binary and telemetry/network behavior have been verified to match the claim.

## Payment launch gate

The membership preview is implemented, but purchases and restore intentionally cannot unlock anything until services are connected. Do not ship paid claims or open the legacy API with this stub. Remaining work:

- Configure real localized annual/monthly store products and RevenueCat offerings.
- Implement authenticated server verification and ownership checks, verified webhooks, purchase/restore refresh, expiration and refunds.
- Decide whether the renderer moves server-side: a modified fully local client cannot provide an absolute payment-enforcement guarantee.
- Replace preview legal notices with published merchant terms, privacy disclosures and retention/deletion controls.
- Run real-device store sandbox tests for completed, cancelled, pending, failed and restored purchases, cross-account access and refund/revocation.
- Measure conversion and retention before claiming the chosen prices are optimal.

## Current launch gate
The app is not ready for public launch under the new architecture until:
- a commercially usable segmentation model/runtime is selected;
- mask quality and rendering quality pass the benchmark;
- production photo/data behavior is verified;
- physical-device release validation is complete.

The previous Kling provider agreement is no longer a launch blocker for **Add Tan** if the shipping Add Tan path does not use Kling or any cloud image provider.
