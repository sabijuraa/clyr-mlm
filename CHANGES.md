# Fix: Theresa (admin account) missing from Sponsor/Upline dropdown

## Problem
theresa@clyr.at is stored with `role = 'admin'` (that's why one login gives
her both the partner dashboard and admin dashboard). The "Change Sponsor"
dropdown in the admin panel only listed `role = 'partner'` accounts, so she
never appeared as an option — even though she's the root of the real
affiliate tree.

The `changeSponsor` backend endpoint itself has no role restriction, so this
was purely a UI/data-source bug, not a data integrity issue.

## Fix
Added a new, separate endpoint used ONLY by the sponsor dropdown, so the
main "all partners" table is untouched and doesn't get cluttered with admin
accounts.

### Files changed
1. `server/src/controllers/admin.controller.js`
   - Added `getSponsorCandidates` — returns `role IN ('partner', 'admin')`.
2. `server/src/routes/admin.routes.js`
   - Added `GET /admin/sponsor-candidates` route.
3. `client/src/services/api.js`
   - Added `adminAPI.getSponsorCandidates()`.
4. `client/src/pages/admin/AdminPartnersPage.jsx`
   - Fetches sponsor candidates on load into new `sponsorCandidates` state.
   - Sponsor dropdown now reads from `sponsorCandidates` (falls back to
     `partners` if that call fails, so nothing breaks).
   - Admin accounts are labeled "— Admin" in the dropdown for clarity.

## How to apply
Copy each file into the matching path in your repo, overwriting the
existing file, then restart/redeploy both server and client.

## How to test
1. Deploy the change (or run locally: `npm run dev` in both `server/` and
   `client/`).
2. Log in as admin, go to Partners, open any partner, click "Sponsor
   ändern".
3. Confirm "Theresa Struger (theresa@clyr.at) — Admin" now appears in the
   list.
4. Confirm the main Partners table still does NOT show Theresa as a row.
5. Assign a test partner to her and confirm it saves (POST
   /admin/change-sponsor still works unchanged).
