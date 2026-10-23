# Monetization checklist — awaiting plan approval

Each phase consists of small sequential slices. Likely file groups below are estimates, not permission to exceed scope. Run `npm run verify` and focused tests after every phase; update IMPLEMENTATION_STATUS.md. Do not advance with unresolved access regressions.

## P1 — Free local preview with exports closed
Dependencies: plan approval. Scope: route/home slice, then preview-service/test slice (2–4 files each).
- [ ] Allow import/camera/editor/compare/settings without payment; preserve draft on dismiss/restart.
- [ ] Keep every unrestricted export closed and keep legacy provider requests closed.
- [ ] Verify navigation and direct service calls: unpaid preview works, export creates no unrestricted file.

## P2 — Stable photo identity and editable library
Dependencies: P1. Scope: source registry/import slice, metadata migration slice, restore-session slice (3–5 files each).
- [ ] Preserve photoId across edits/reopens/rename and supported normalized/recompressed matches; ambiguous matches use recovery without automatic charging.
- [ ] Persist source/mask/exact parameters/version; retain old pairs and read legacy metadata without fabricated purchases.
- [ ] Test migration, deletion/reimport identity, repeated exports, distinct photos and restored editing state.

## P3 — Authenticated verified credit ledger
Dependencies: P2 and approved recovery policy. Scope: identity slice, SQL schema slice, verification/webhook slice, reservation/finalization slice (3–5 files each).
- [ ] Authenticate customer ownership; one credit per verified transaction and one unlock per customer/photo; no photo data at API.
- [ ] Test parallel redemption, duplicate/out-of-order callbacks, failed verification, reservation recovery and targeted refund revocation against a real transactional test database.
- [ ] Verify account isolation, sandbox separation and idempotent Sign in with Apple/RevenueCat ownership reconciliation.

## P4 — RevenueCat purchase-to-export slice
Dependencies: P3 and store setup. Scope: SDK/config slice, access refresh slice, durable-intent/export slice (3–5 files each).
- [ ] Pin compatible SDK; native development build initializes, fetches current Offering and refreshes/restores pro on resume.
- [ ] Single purchase creates one verified credit; all Save/Share/archive/result/library paths use photo authorization and resume one durable operation.
- [ ] Test cancelled/failed/pending/delayed purchases, SDK/server outage, missing products, purchase-before-kill, export-before-kill, permission failure, repeat taps and no second charge after interruption.

## P5 — Paywall and measurement
Dependencies: P4. Scope: config adapter slice, preview/cards/checkout slice, event pipeline slice (2–5 files each).
- [ ] Exact requested copy, edited preview, three localized products/periods, selected-amount CTA, renewal/legal/restore/dismiss and accessibility.
- [ ] A/B configurations prepared; explicit selection survives refresh; metadata cannot alter access/prices; experiments disabled.
- [ ] Verify all requested client/server events, transaction deduplication, cohort denominators/refund-adjusted revenue and absence of image data.

## P6 — Sandbox/device acceptance and launch documentation
Dependencies: P5. Scope: focused test fixtures, device checklist, docs slices (2–5 files each).
- [ ] Physical iPhone sandbox: repeated same-photo export/re-edit/share, new-photo unlock, expiration with individual unlock retained, restore, refund, reinstall and cross-device ownership.
- [ ] Complete failure matrix: cancel, fail, pending, duplicate, offline, RevenueCat unavailable, redemption failure, termination after purchase/during export, missing products and recovery conflicts.
- [ ] Record actual device/store evidence, unresolved platform limits, manual configuration and source-resolution claims; no public launch or experiment until gates pass.
