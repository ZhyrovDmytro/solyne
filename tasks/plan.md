# Export monetization — proposed, awaiting review

Date: 2026-10-16. No implementation approved or performed.
Scope: the user's attached Solyne paywall, pricing and single-photo specification. Preserve the local renderer and legacy providers. Tasks are in `tasks/todo.md`; existing architecture migration tasks remain intact.

## 1. Observed implementation

Read ARCHITECTURE.md, IMPLEMENTATION_PLAN.md, IMPLEMENTATION_STATUS.md, LAUNCH_READINESS.md and the editor/export/library/purchase code. No AGENTS.md was found in the project, enclosing instruction locations checked, or sibling-project search.

- Expo 57 / React Native 0.86.3. No RevenueCat SDK, account system, purchase database, or Expo development-client dependency. app.json has no explicit iOS bundle identifier.
- The primary editor uses local MediaPipe segmentation and deterministic Canvas/OKLab rendering, not the generative API. Models/WASM load over HTTPS; offline readiness and physical-device quality remain unverified.
- The current purchase implementation is deliberately fail-closed: hasPaidAccess always returns false. Home navigation, Stack.Protected and photoDataUrl prevent unpaid previews. Library reading, archiving, local PNG persistence, Photos saves and cloud generation also require this global stub.
- The paywall is a design preview with static annual/monthly prices, the original photo, and nonfunctional purchase/restore. Replace it with Single Photo/Weekly Pro/Yearly Pro and the edited preview.
- Imports normalize to JPEG at maximum 2048px and discard the original source reference. Current export is normalized-source resolution, not camera resolution. Do not advertise full-resolution camera export without a separately approved source-retention change.
- Saved edits contain original/rendered files, preset and dimensions, but no source photo identity, precise intensity, corrected mask, renderer version or purchase reference. Reopen supports comparison/save/delete, not restoring an editable session.
- The Express generative service remains for comparison and defaults to 503 before provider work unless authorization middleware is injected. Keep it closed. A subscription allowing unlimited exports must not imply unlimited paid provider calls.
- The checkout files are largely untracked. Do not overwrite unrelated work or commit the entire checkout.

## 2. Export boundaries

Protect the DOM export request and native export coordinator, local-tan PNG persistence, result-saving Photos calls, edit-library unrestricted rendered-file writes, legacy result Save and archive/retry, saved-edit Save, and the new Share file handoff. The DOM currently creates a full PNG before calling onExport; introduce an authorization request boundary before delivering an unrestricted export across that bridge.

Make selection, camera, rendering input, intensity/presets, comparison, settings, library listing and appropriate preview reading available without membership. Preserve legacy paid-provider protection separately. Replace all blanket paid-access tests with operation-specific policy tests; do not simply remove security tests.

Any preview/draft cache remains private app storage and is never exposed via download, share, browser navigation or file-provider integration. Existing full rendered library assets are not proof of purchase. A modified local client or screenshots cannot be completely prevented by a photo-free purchase server; payment enforcement is for the supported app, not DRM.

## 3. Proposed domain and ledger

Policy: canExport(photoId) = hasActivePro || isPhotoUnlocked(photoId). Credit authorization is a separate transition that creates durable access, never a subscription entitlement counter.

Use a small authenticated Express purchase API and transactional PostgreSQL database, isolated from image-upload routes. Store only:

- Customer: internal opaque ID, authenticated identity binding, RevenueCat ID, identity aliases/transfer audit.
- Purchase: store/environment/transaction ID unique together, owner, allowed product, verified status and refund state. Separate sandbox and production.
- Credit: one per verified solyne.photo.1 transaction; available/reserved/redeemed/revoked state.
- PhotoUnlock: unique (customerId, photoId), credit/purchase reference, active/revoked state.
- ExportOperation: idempotency key, customer, photoId, destination, reservation, outcome and recovery state.
- Webhook inbox: unique event ID, verified origin, processing/retry state. Event deduplication does not replace transaction deduplication.

Only server-to-server RevenueCat verification or authenticated, reconciled webhook processing grants credits. Client purchase results request reconciliation; they cannot mint balances. Verify app, product, environment and authenticated ownership. Reject caller-selected customer identity. Serialize redemption with row locks and database uniqueness constraints. Duplicate callbacks, webhook retries and parallel exports must return the same grant/unlock rather than spending twice. Refunds revoke an unused credit or its funded unlock; never erase an unrelated purchase or active Pro grant. Cancellation alone does not end Pro before paid-through expiry. Reconcile delayed/out-of-order events against current verified state.

### Export failure and interruption semantics

The requirement to redeem before export and the requirement that failures never consume credits need a reservation/finalization protocol:

1. Refresh access; accept valid Pro or an existing purchased unlock first.
2. Prepare/validate rendering and obtain Photos permission or sharing availability before reserving a credit.
3. Atomically reserve an available credit for this photo and operation. If none, show paywall; after a verified purchase, reconcile the credit and retry the same operation.
4. Persist an operation journal before handing off a file. A reservation authorizes only this photo and operation; other photos cannot spend it.
5. On confirmed successful file delivery, atomically redeem and create the permanent photo unlock. Retry finalization idempotently after a network loss. Repeated exports of an unlocked photo never touch balance.
6. On definite failure before delivery, release the reservation without spending. A cancelled share is not a successful export. Purchase success itself still leaves a paid unused credit if export fails.
7. On crash/ambiguous Photos or share outcome, retain the reservation for the same photo and recover/retry; never buy again automatically or release on a timer that could allow spending on a second photo. Native file delivery and a server transaction cannot be one atomic commit. Document and test this limit; unresolved delivery must not be falsely recorded as consumed.

Offline: no new credits or redemptions. Permit previously verified individual unlocks from a signed local access cache; Pro requires a still-valid bounded cache and never extends beyond known expiration. Reconcile on resume/connectivity restoration. Refund revocation cannot be instantaneous while offline.

## 4. Photo identity and migration

Assign a UUID photoId at import, copy the normalized source into durable private storage, and retain it through renaming, editing, archiving and reopening. Separate photoId from saved edit IDs. Keep local aliases for picker asset identity when available, normalized decoded-pixel hashes and versioned perceptual matching. No pixels, filenames, EXIF, hashes or perceptual descriptors go to the ledger or analytics; only opaque photo IDs.

Exact hashes catch identical normalized pixels, not arbitrary JPEG recompression. Use local perceptual candidates with conservative geometry/content checks and a same-photo recovery flow; ambiguous matches must not silently merge different photos or immediately prompt another purchase. Guarantee continuity for app-managed sources and derivatives. Arbitrary external recompression/cropping cannot be perfectly identified without false matches; this limitation needs product review before claiming universal deduplication.

Add a versioned library schema: photoId, original source identity/aliases, exact intensity and tone parameters where supported, renderer/edit/mask version, corrected mask or reproducible corrections, and cached verified unlock/purchase reference. The backend remains authoritative. Purchased unlocks remain separate from Pro and survive subscription expiry. Deleting an edit must not delete its purchase grant or local source-identity tombstone.

Read old metadata without destructive rewrite; migrate lazily with stable persisted IDs. Preserve existing pairs even when precise parameters are unavailable. Do not invent purchase history for old files or a boolean unlocked flag. Enable re-editing through a restored source/mask/parameter session; old presets can be explicitly approximate when exact state was never saved.

## 5. Identity and external setup

Recommendation for recoverable purchases: Sign in with Apple at the first checkout/restore, while preview stays anonymous. Map its server-verified subject to an internal ID and use that ID with RevenueCat. Never accept an arbitrary RevenueCat ID as backend authentication. Define restore transfer/conflict rules and idempotent migration if anonymous customers already exist. An install-only token is smaller but loses reliable reinstall/cross-device credit recovery; Keychain persistence alone is not a guarantee. Photos remain local, so account recovery restores ownership, not the photo library. Recognizing a reimported photo after reinstall cannot be guaranteed with opaque IDs alone; review an encrypted user-controlled identity-map backup separately if that guarantee is required.

Owner setup required:

- Apple paid-app agreements/tax/banking, confirmed bundle ID and signing, Sign in with Apple capability, sandbox testers and subscription review metadata.
- solyne.photo.1 consumable at US $1.49 (use $1.59 only if its price point is confirmed); solyne.pro.weekly at $5.99/week and solyne.pro.yearly at $29.99/year in ONE subscription group, same access level. No trial or lifetime product.
- RevenueCat Apple app and store credentials configured securely, public iOS SDK key, server secret, `pro` entitlement attached only to weekly/yearly, current Offering with all three packages. The consumable is not attached to pro.
- HTTPS API/PostgreSQL hosting, secret management, authenticated webhook endpoint, production/sandbox separation, published Terms/Privacy and support URL. Never paste private keys into chat or ship them in Expo public variables.

Use the current compatible react-native-purchases release, installed through Expo guidance and pinned after Expo 57/RN 0.86 native-build validation; exact version is an implementation checkpoint. Use expo-dev-client and real development builds, not Expo Go purchase simulation as acceptance evidence. No second StoreKit implementation alongside RevenueCat.

Initialize once with the authenticated identity, add CustomerInfo listener and app-resume refresh, fetch current Offering, execute selected package purchases, restore, reconcile transactions and propagate loading/unavailable/pending/cancelled/error states. A delayed purchase is reconciled independently of the screen; only resume its saved photo intent. Never start a second purchase to fix missing verification.

## 6. Paywall and instrumentation

Components: edited-preview header, validated remote-config adapter, product cards, checkout/renewal disclosure, restore/legal/dismiss footer, export-intent coordinator and purchase status feedback.

Use the exact requested headline, subtitle and product benefit text. Yearly carries the long-term-value badge; A defaults Yearly, B defaults Single Photo. Respect explicit user selection through refreshes. All billing amounts come from actual Offering packages and localized product prices; localize the store period units. Button includes selected full amount and actual period. Missing packages show unavailable state, never fallback prices or fabricated access. Disable all checkout if no products return. No introductory offer/trial in v1. Show annual total prominently; omit savings initially, or compute them only from comparable same-currency numeric prices with an explicit comparison basis.

Offering metadata can configure order, highlight, initial selection, headline, descriptions and savings visibility. Validate against an allowlist/schema and use safe presentation defaults; remote metadata cannot grant access, redefine product types or supply billing prices. Experiments remain disabled until purchase/telemetry QA passes.

Record paywall views, explicit plan selections, attempts and verified purchases with anonymous internal customer/operation IDs and variant/Offering IDs; no image identifiers in analytics. Backend events record redemptions, subscription starts/renewals/cancellation/expiry/refunds. Deduplicate on event/transaction IDs and distinguish cancellation from expiry. Define revenue per unique paywall viewer and per new-user cohort with store-reported currency/proceeds handling and refunds; do not sum unrelated currencies. No pixel/EXIF/image-name logging.

## 7. Risks requiring review

Approve account-backed recovery and the reservation semantics above. Full camera-resolution export is currently unsupported and would need an explicitly scoped source-retention adjustment, not a renderer rewrite. Universal external recompression matching, atomic delivery to Photos plus ledger commit, absolute local-client enforcement, and anonymous cross-device recovery are not guarantees this architecture can honestly make. Existing offline/local copies cannot be recalled after a refund.

## 8. Ordered implementation and acceptance

See tasks/todo.md. Implement only after plan approval, one phase at a time. Every phase runs npm run verify plus focused tests and updates IMPLEMENTATION_STATUS.md with actual results and manual setup still outstanding. A passing mock test is not store sandbox validation. Keep existing provider code and architecture benchmark requirements.

Sources checked:
- https://www.revenuecat.com/docs/getting-started/installation/expo
- https://www.revenuecat.com/docs/platform-resources/non-subscriptions
- https://www.revenuecat.com/docs/customers/identifying-customers
- https://www.revenuecat.com/docs/integrations/webhooks
- https://www.revenuecat.com/docs/tools/offering-metadata
- https://www.revenuecat.com/docs/getting-started/displaying-products
- https://developer.apple.com/in-app-purchase/

RevenueCat also supports virtual currency, but a single PostgreSQL ledger avoids a second balance authority and still needs photo-specific unlocks/reservations. Do not use pro as a consumable counter.
