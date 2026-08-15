# Fix: Brochure PDF upload fails ("Upload fehlgeschlagen")

## Problem
Uploading a new Partner-Broschüre (PDF) in Admin → Branding always failed
with a generic "Upload fehlgeschlagen" error.

## Root cause
`server/src/routes/admin.routes.js` wired the brochure upload route to the
**image-only** multer instance (`upload`), whose file filter only allows
jpeg/jpg/png/gif/webp/svg. A PDF fails that filter, multer throws before
the request reaches the controller, and the server returns a 500 — which
the frontend shows as a plain "Upload fehlgeschlagen" toast with no detail.

The correctly-configured multer instance for documents (`uploadDocuments`,
allows pdf/doc/docx, 10MB limit) already existed in
`server/src/middleware/upload.middleware.js` — it just wasn't used on this
one route.

## Fix
`server/src/routes/admin.routes.js`
- Imported `uploadDocuments` alongside the existing `upload` import.
- Changed the brochure route to use `uploadDocuments.single('brochure')`
  instead of `upload.single('brochure')`.

Logo and favicon routes are untouched — they correctly stay on the
image-only filter.

## How to apply
Copy `server/src/routes/admin.routes.js` from this package into the
matching path in your repo, overwriting the existing file, then
restart/redeploy the **server** only (no client changes needed).

## How to test
1. Deploy the change.
2. Log in as admin → Branding → "Neue Broschüre hochladen (PDF)".
3. Select a PDF file and upload.
4. Confirm the toast shows "Broschüre hochgeladen!" and "Aktuelle
   Broschüre ansehen" opens the new PDF.
5. Confirm logo/favicon uploads (images) still work as before.
