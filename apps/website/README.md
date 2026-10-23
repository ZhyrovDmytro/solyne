# Solyne website

Buildless static landing page, with an accessible comparison slider, FAQs and legal/support pages. No analytics, forms, cookies or external fonts. Artwork is illustrative and reused from the app; confirm distribution rights before public launch.

Preview from the repository root:

```sh
python3 -m http.server 4173 --directory apps/website
```

Deploy `apps/website` as the static publication directory on your chosen host. It supports directory-index routes `/privacy/`, `/terms/`, `/support/` and relative assets for subpath hosting. No domain or App Store ID is assumed. If a host requires a build command, use `python3 scripts/build-legal-pages.py` from the repository root.

Edit `docs/legal/*.md`, run that command and synchronize `apps/mobile/src/config/legal-documents.ts`. Legal pages remain explicitly marked drafts until operator details and policies are finalized. Set the app's `EXPO_PUBLIC_WEBSITE_URL` only after the Solyne pages are live at the chosen origin. The page currently says coming soon; replace that with the verified App Store link after release. No waitlist is collected.
