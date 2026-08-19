# Fix: Public "Broschüre" links show the wrong/stale PDF

## Problem
Uploading a new brochure in Admin → Branding worked (the "Aktuelle
Broschüre ansehen" link showed the correct new PDF), but the public
site's "Broschüre" link (navbar, mobile menu, homepage CTA) kept
showing an old/incorrect file.

## Root cause
The real upload flow (`branding.controller.js` → `uploadBrochure`)
uploads the PDF to DigitalOcean Spaces and saves the CDN URL into the
`branding.brochure_url` column in the database. The admin page reads
that value, so it's always correct.

The public-facing links, however, were hardcoded to a static path:

    /api/downloads/CLYR-Broschuere.pdf

which is served from `server/public/downloads/CLYR-Broschuere.pdf` on
disk. That file doesn't exist in the repo (only a README.txt does),
and nothing in the active upload flow ever writes to it — so the
public links never reflected what was actually uploaded.

## Fix
- `client/src/context/BrandContext.jsx`
  - Added `brochureUrl` to the default branding state.
  - `loadBranding()` and `refreshBranding()` now pick up
    `brochure_url` from the `GET /api/branding` response and store it
    as `brochureUrl`.
  - Exposed `brochureUrl` on the context value.
- `client/src/components/common/Navbar.jsx`
  - Both "Broschüre" links (desktop nav + mobile menu) now use
    `brochureUrl` from `useBrand()` instead of the hardcoded path.
- `client/src/pages/public/HomePage.jsx`
  - Imported `useBrand` and switched the homepage "Download Broschüre"
    button to use `brochureUrl` as well.

Now all three public links always point at whatever PDF is currently
set in `branding.brochure_url` — the same value the admin page shows.

## How to apply
Copy the three files from this package into the matching paths in
your repo, overwriting the existing ones, then rebuild/redeploy the
**client** only (no server or database changes needed).

## How to test
1. Deploy the change.
2. Log in as admin → Branding → upload a new "Neue Broschüre (PDF)".
3. Confirm "Aktuelle Broschüre ansehen" opens the new PDF (as before).
4. Go to the public site → click "Broschüre" in the navbar (desktop
   and mobile) and the homepage "Download Broschüre" button.
5. Confirm all three now open the *same* newly uploaded PDF.
