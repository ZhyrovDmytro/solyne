# Solyne — complete App Store publishing context

Prepared 23 October 2026 from the local repository. Give this entire document and the three files in docs/legal to the ChatGPT conversation helping publish Solyne. This describes a development build, not a completed or approved release.

## Instructions for the publishing assistant
Help prepare the App Store Connect listing, website content, privacy questionnaire, subscription setup and submission checklist. Distinguish implemented functionality from planned functionality. Ask for missing business details; never invent a domain, merchant identity, contact email, licence, product ID, privacy answer, test result or Apple approval. Re-check Apple's current rules before submission. Do not describe Solyne as ready until the blockers below are resolved. Do not publish draft legal documents with unresolved fields.

## Product and positioning
Solyne is a mobile photo editor for applying a natural-looking digital tan to skin in a photo. The intended first platform is iPhone. Brand tone: warm, calm, understated and editorial. Existing lines include “Your golden hour, anytime,” “A natural-looking tan. The same beautiful you,” and “Your light. Your look.” The interface uses warm paper/cream backgrounds and olive/gold accents.

The core value is control over a cosmetic photo effect while preserving the photograph's composition and identity. It is not a sun-exposure recommendation, medical/dermatological assessment, actual tanning service or skin-protection product. It does not remove tan lines as a separate shipping feature. It has no social feed, messaging, public posting, accounts or cloud-history service.

## Intended user journey
1. Choose one photo with the system picker or take a photo after granting camera access.
2. The app normalizes the image to JPEG, maximum 2048 pixels on its longest side.
3. Membership gates personal editing and saving. The current build always sends users to a preview paywall; nobody can obtain paid access yet.
4. In the implemented editor prototype, local ML identifies skin areas and facial landmarks. An adjustable deterministic color transform applies a tan effect without regenerating the photograph.
5. Adjust intensity, inspect selection, add/remove selected areas, undo corrections, reset the automatic mask and compare with the original.
6. Export a PNG at normalized source resolution, save it to Photos and archive the before/after pair locally.
7. Reopen and compare saved pairs or delete them from the app's library. Photos exports are separate copies.

Steps 4–7 are implemented behind the disabled entitlement boundary; their existence does not mean a new user can complete them in the current build.

## Architecture and processing
Monorepo: React Native 0.86 / React 19 / Expo SDK 57 / Expo Router; TypeScript. The editor uses an Expo DOM component and Canvas. MediaPipe Tasks Vision 1.1.1 runs SelfieMulticlass segmentation and Face Landmarker on the CPU. It detects editable skin, not identity. The color renderer uses a source-relative OKLab transformation and cached masks, so changing intensity does not require new inference or an image-generation API call. Facial-feature exclusions and manual correction help avoid editing eyes/mouth and other unwanted regions, but quality still needs representative validation.

Pinned runtime/WASM assets load from jsDelivr; model weights load from Google-hosted storage. First use currently requires internet. Do not promise fully offline use. The active editor does not call the legacy photo-generation API. Nevertheless, a production network audit is pending: avoid absolute “photos never leave your phone” or “100% private” claims before verification.

The repository retains an Express API with OpenAI, Kling and Replicate comparison adapters. This is legacy research/comparison code, not the primary Add Tan flow. Its production tan routes currently fail closed with BILLING_UNAVAILABLE unless authorization is injected. Do not deploy this code as an open generation service. Do not describe those providers as recipients of photos from the active local editor. Any future cloud mode needs separate privacy disclosure, explicit permission where required, provider terms and security controls.

## Storage and permissions
- Picker: selected-image access; no broad photo-library permission needed to select a photo.
- Camera: requested only when taking a photo.
- Photos save: requests permission to add an export.
- Normalized originals and preview exports can exist in temporary/cache storage. Clearing the selected session does not promise immediate deletion of those files.
- Archive under the app document directory: before image, after JPEG/PNG and JSON metadata (ID, timestamp, preset, dimensions).
- Per-edit deletion removes the archive pair and metadata. It does not erase exported Photos files, originals, other-app copies or backups.
- Uninstall normally removes app data; offloading may retain it. Backup/restore behavior still needs device validation.
- Library list/read currently require membership; deletion itself does not. Resolve usable deletion access after membership expiry before release.
- No implemented Solyne login, remote account or account deletion flow.
- No integrated advertising, behavioral analytics or third-party crash-reporting SDK identified in the current app.
- External model downloads, website links, Apple services and any future support inbox still have their own network/data behavior.

## Monetization: planned versus current
Brand: Solyne Plus. Designs show annual $29.99 and monthly $5.99 USD, no free trial. These are design hypotheses, not live store prices, offers or confirmed business decisions. Annual total must remain prominent when localized pricing is connected.

Current billing implementation always returns false for paid access and throws unavailable errors for purchase/restore. No StoreKit/RevenueCat integration or live product identifiers are configured. RevenueCat was discussed as an option, not selected or installed. Implement real products, entitlement refresh, restore, pending/canceled/error handling and revocation/expiration behavior. Choose a suitable verification architecture; a local editor does not inherently require a photo-upload backend or user accounts. Update legal/privacy copy to match the actual billing provider before launch.

Planned subscription terms: monthly or annual auto-renewing access, price and period shown before confirmation, Apple processes payment, Apple Account subscription management, restore eligible purchases, refunds via Apple and mandatory consumer rights preserved. Use Apple's Standard EULA unless a custom EULA is deliberately adopted; the drafted Solyne terms supplement it.

## Website and legal package
Website is not built or published by this change. Prepared Markdown content:
- docs/legal/privacy.md → /privacy
- docs/legal/terms.md → /terms
- docs/legal/support.md → /support

The app now provides Privacy, Terms and Support navigation from Home, Terms/Privacy from the paywall, and cross-links within the legal screen. These routes are outside the membership gate. Full text is bundled for in-app reading. Set EXPO_PUBLIC_WEBSITE_URL to the owned HTTPS origin to enable “Read on the Solyne website” links. Rebuild the app after setting it. No guessed domain is used.

When editing policies, update both Markdown files and apps/mobile/src/config/legal-documents.ts so website and app text agree. The current in-app page explicitly marks these as drafts. Remove that draft notice only after completing identity/contact fields and release review.

Publish a small landing page describing the app, real screenshots and a real App Store link once available. Footer must link Privacy, Terms and Support. Do not add advertising, trackers, analytics or contact forms without reviewing and updating the website privacy notice. A static host may retain access logs; choose the host and document that behavior. Public legal pages must work over HTTPS without login.

## Missing operator decisions and fields
Complete all bracketed placeholders in legal documents:
- Legal operator/seller name and business address/country, matching Apple enrolment.
- Solyne website domain is not yet established. Shared public support/privacy contact: support@nummio.fyi, taken from Nummio at the owner’s request. Delivery and handling of Solyne requests have not been tested.
- Policy effective date when actually published.
- Support provider/location, support-message retention, international transfers/safeguards if relevant, and realistic response target.
- Target countries, supported language(s), intended minimum user age and age rating based on Apple's questionnaire. “Not directed under 13” in the draft is a proposed policy, not an implemented age gate or final eligibility decision.
- Final subscription prices, periods, products, included features, billing provider and offer decisions.
- Model/runtime commercial distribution rights and required notices.

Do not automatically use the developer's personal home address or assume a company exists.

## Draft App Store copy — use only after validating features
Name: Solyne
Subtitle: Your golden hour, anytime
Suggested primary category: Photo & Video (confirm in App Store Connect).

Description draft:
“Find your glow with Solyne. Add an adjustable digital tan to your photos, refine where the effect appears, and compare your edit with the original. Choose a photo or take one, adjust the intensity, and use selection tools for the details. Save your finished look as a PNG and keep before-and-after edits in your local library.

Solyne Plus provides the editing and saving features described on the purchase screen. Subscription options and localized prices are shown before confirmation. Manage or cancel your subscription in your Apple Account settings.

Solyne creates a cosmetic photo effect. Results vary by photo. Exports are up to 2048 pixels on the longest side. Initial model downloads require internet access.

Privacy: [WEBSITE_ORIGIN]/privacy
Terms: [WEBSITE_ORIGIN]/terms
Support: [WEBSITE_ORIGIN]/support”

Do not submit this description while purchases or advertised features remain unavailable. Do not advertise original-resolution export, tan-line removal, perfect skin detection, offline-first startup, face recognition, generative AI transformation or guaranteed results.

## App Store privacy questionnaire guidance
Do not automatically select “Data Not Collected.” Photo editing is local in the active code, but review the final binary, WebView requests, CDN/model hosting, actual diagnostics, billing SDK, transaction handling, website and support practices first. Determine what is transmitted off-device, whether retained and for what purpose, linked to identity or used for tracking, following Apple's definitions. Do not call temporary landmarks biometric identification. No ATT prompt is currently justified by an implemented tracking feature; reassess if tracking is added. App privacy answers must match the final policy and release behavior.

## Submission and release blockers
1. Working purchases and restore, or an explicit free-launch product decision; current build cannot unlock editing.
2. Physical-iPhone validation of the DOM/Canvas/MediaPipe stack, memory, latency, camera and picker permissions, export, archive, deletion, restart, low storage, network failure and first-use downloads.
3. Representative mask/rendering benchmark: 30–50 licensed photos across varied skin tones, lighting, clothing/hair boundaries, full-body and multiple people; prototype quality is not yet a passed release gate.
4. Select production model/runtime, confirm licences and attribution; decide bundling strategy.
5. Complete and publish legal/support pages, configure app website URL, synchronize bundled text, remove draft banner and verify public links.
6. Define reachable deletion when unsubscribed and validate retention/backup claims.
7. Configure unique iOS bundle identifier, build number, signing, production build process, supported OS/device targets, final app icon and privacy-manifest/required-reason API declarations as applicable to included SDKs.
8. Apple Developer membership, App Store Connect record, agreements/tax/banking for paid products, real products and availability. These external statuses have not been inspected.
9. Signed TestFlight testing and sandbox purchase cases: success, cancellation, pending, failure, restore, expiry and refunds/revocation.
10. Actual device screenshots, final metadata, age-rating and privacy questionnaires, support/privacy URLs and review notes. Reviewers must be able to access and test the complete offering.
11. Build with Apple's currently required Xcode/iOS SDK versions (as checked on preparation date: Xcode 26+ / iOS 26+ SDK); verify again at submission.

## Current verification evidence
Prior to this documentation change: typecheck and lint passed; 62 mobile tests and 4 image-pipeline tests passed. API tests were blocked by sandbox socket-listening restrictions (EPERM); this is not a clean full-suite pass. Existing docs report a successful Expo iOS/DOM bundle export and browser smoke checks, but physical-iPhone release testing remains pending. Unit tests do not prove subscriptions, image quality or device readiness.

## Primary references to re-check
- App review: https://developer.apple.com/app-store/review/guidelines/
- Privacy details: https://developer.apple.com/app-store/app-privacy-details/
- Subscription presentation: https://developer.apple.com/app-store/subscriptions/
- Apple Standard EULA: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
- SDK requirements: https://developer.apple.com/news/upcoming-requirements/
- Subscription management: https://apps.apple.com/account/subscriptions
- Apple purchase help/refunds: https://reportaproblem.apple.com/

## Operator/contact source update — 23 October 2026
The owner instructed us to use https://www.nummio.fyi as the source for operator/contact details. Its Privacy, Terms and Support pages were read directly. The site labels its developer/company as “Nummio” and lists support@nummio.fyi for support, privacy and deletion requests. That email is now used in Solyne’s legal drafts at the owner’s instruction. “Nummio” is a published brand/developer label, not evidence of a registered legal entity name. The source does not state a business address, operator country, support email provider, fixed support retention or response time. Those fields remain unresolved. Nummio’s domain and existing legal URLs belong to the coin-scanning app; they must not be presented as published Solyne policies. Solyne needs its own pages, whether on a separately chosen domain or explicitly designated paths on an existing site. No Solyne domain or hosting paths were inferred.

Sources:
- https://www.nummio.fyi/privacy/
- https://www.nummio.fyi/terms/
- https://www.nummio.fyi/support/

Nummio’s cloud coin analysis, RevenueCat integration, free trial and May 2026 policy effective date are specific to Nummio and have not been copied into Solyne’s processing claims or offer.

## Landing-page implementation
A static landing page is now in apps/website, including an illustrative comparison slider, product explanation, FAQs and generated Privacy/Terms/Support routes. Run python3 scripts/build-legal-pages.py after editing the legal Markdown. Deployment target directory: apps/website. The website is not automatically live merely because it is pushed to GitHub. No Solyne domain or App Store URL has been invented; legal pages visibly remain drafts until missing business details are supplied. The earlier “website not built” statement is superseded by this implementation note.

Latest repository verification: typecheck and lint passed, and the full test suite passed with local socket access: 48 API + 62 mobile + 4 image-pipeline tests (114 total). Static landing-page navigation, asset links, legal generation and the browser comparison control were also checked. This supersedes the earlier sandbox-limited test result; physical-iPhone testing is still pending.
