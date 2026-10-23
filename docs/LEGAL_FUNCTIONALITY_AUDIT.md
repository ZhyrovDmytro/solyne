# Solyne: EU and US launch functionality audit

Reviewed 2026-09-20. This is a product and engineering gap assessment, not a legal conclusion. Exact obligations depend on the operator, user locations, age policy, provider contract, and whether Solyne adds accounts, advertising, analytics, or cloud history.

## Current data flow

The phone normalizes a chosen photo and uploads it to an unauthenticated Express API over a configured URL. The API keeps upload bytes in memory, writes a temporary file for the local Kling CLI, sends the image to Kling, and removes the temporary file. Kling returns an image URL. The phone downloads the edited image and archives it together with the original in the app document directory. A user can compare and delete that local pair. API jobs and result URLs have a 30-minute access TTL, but stale entries may remain in memory until another request or server restart. Deleting a local pair does not delete provider copies, task records, or a copy previously saved to the system Photos library.

## Must resolve before real users upload

| Priority | Function or control | Current gap / acceptance condition |
|---|---|---|
| P0 | Approved AI provider | Obtain production integration rights and suitable data terms. Confirm provider retention, deletion, training/promotion use, subprocessors, and transfer mechanism. Replace personal Kling CLI OAuth. No UI can compensate for missing provider rights. |
| P0 | Pre-upload disclosure and permission | Before the first upload, name the actual AI recipient and explain what photo data is sent and why. Require an affirmative choice before transmission; a refusal leaves the user in the editor. Link an accurate privacy notice. Keep the permission distinct from any GDPR legal basis chosen by counsel. Apple's current review rules explicitly require permission before sharing personal data with third-party AI. |
| P0 | Privacy notice and help | Add an always-reachable Privacy/Help screen and public privacy-policy URL with operator/contact, data categories, purposes, legal bases where relevant, provider/other recipients, transfers, retention, user rights, and how to submit requests. Publish accurate App Store privacy and Google Play Data safety disclosures. The current one-sentence upload note is insufficient. |
| P0 | Deletion that matches the promise | Add “Delete all edits on this device” and automatic expiry of stale API jobs. For provider-held or future cloud data, implement a verified request path that can locate a job, delete its images and metadata, request deletion from the provider, and report completion or lawful retention exceptions. Do not label local deletion as deletion from Kling. |
| P0 | Secure multi-user API | Use HTTPS, prevent unauthorized generation and access to job results, enforce per-user ownership if storing cloud history, protect provider credentials, rate-limit paid operations, and restrict staff access. The current HTTP LAN API has no identity or abuse controls. Avoid returning long-lived public image URLs for private photos unless their access is adequately controlled. |
| P0 | Child policy | Choose adult/general-audience eligibility or implement age-appropriate onboarding and parental controls. Do not knowingly collect photos from under-13 US users without a COPPA-compliant path if COPPA applies. Photos containing a child's image count as personal information under COPPA when collected from a child. EU child-consent ages vary by member state. |
| P0 for Google Play | Report AI output | Add an in-app “Report this result” action and a developer review process for offensive or prohibited generated content. Google Play's AI-generated-content policy calls for in-app reporting. Do not send the image with the report by default without explaining that transfer. |

## Conditional on product choices and legal review

| Trigger | Function or control |
|---|---|
| Accounts or cross-device cloud history | Sign-in; private per-user list/view/download/delete; export of original, edited image, and associated metadata; full account deletion in the app. Google Play also requires a web deletion request path for apps that let users create accounts. Apple requires in-app account deletion. |
| GDPR-covered processing | Facilitate requests for access, erasure, correction where applicable, restriction, objection, and portability; verify the requester; track deadlines and provider follow-through. Decide a lawful basis for each purpose and assess whether a DPIA is required. A contact/request channel can be sufficient for a small initial service if it actually works; a complex self-service dashboard is not inherently required. |
| Applicable US state privacy law, including California if its coverage thresholds are met | Provide the applicable notice and request routes (know/access, delete, correct and other rights as relevant). Add sale/share or sensitive-data opt-out controls only if those practices and laws apply. There is no single universal US privacy toggle. Avoid ad/analytics SDKs until their data flows are reviewed. |
| EU AI Act Article 50 if a tan edit meets the legal definition of a deep fake, or another transparency rule applies | Clearly disclose that the result was AI manipulated at exposure and decide how the disclosure accompanies exports or public sharing. Check the provider's machine-readable marking and whether the standard-editing exception applies. The exact classification of Solyne's edits needs legal review. |
| Photos of other people | Add an upload rule and user confirmation that the uploader has authority to submit each person's image; provide a way to report nonconsensual use. This confirmation does not replace real permission or a lawful basis. |
| Marketing or analytics | Separate purpose-specific notices and choices; update store disclosures. Do not reuse private photos for examples, training, ads, or quality review without a valid basis and suitable provider rights. |

## Existing features to retain

- System photo selection, local original/edit archive, before/after comparison, repeat Save to Photos, and per-edit local deletion.
- Image upload size/type validation, server-only provider credentials, normalized errors, no image-byte logging, and temporary-file cleanup.

## Official sources

- [Apple App Review Guidelines, 5.1.2](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311), [AI-generated content policy](https://support.google.com/googleplay/android-developer/answer/13985936), [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- [EDPB: information to give individuals](https://www.edpb.europa.eu/sme/find-practical-info/faq_en), [data subject rights](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en), [controller/processor contracts](https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en), [international transfers](https://www.edpb.europa.eu/sme/be-compliant/international-data-transfers_en)
- [EU AI Act Article 50](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50) and [deep-fake definition](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-3)
- [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), [FTC mobile-app security](https://www.ftc.gov/business-guidance/resources/app-developers-start-security)
- [California Privacy Protection Agency FAQ](https://cppa.ca.gov/faq)
- [Kling Terms of Service](https://kling.ai/docs/user-policy) and [Privacy Policy](https://kling.ai/docs/privacy-policy)
