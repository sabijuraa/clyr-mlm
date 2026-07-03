// server/src/controllers/stripe-connect.controller.js
import Stripe from 'stripe';
import { query, transaction } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { isVatIdFormatValid } from '../services/tax.service.js';
import { generateStatementNumber } from '../services/payout.service.js';
import { releaseHeldCommissions } from '../services/commission.service.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://clyr.shop';

const calculateAffiliateCommissionVat = (partner, netAmount) => {
  const country = String(partner.country || '').toUpperCase();
  const vatId = String(partner.vat_id || '').trim();
  const hasValidVatId = vatId && isVatIdFormatValid(vatId, country);

  if (country === 'DE' && hasValidVatId) {
    return { vatAmount: 0, grossAmount: netAmount, vatRate: 0, vatType: 'reverse_charge' };
  }

  const vatRate = country === 'DE' ? 19 : country === 'AT' ? 20 : 0;
  const vatAmount = Math.round(netAmount * (vatRate / 100) * 100) / 100;
  return {
    vatAmount,
    grossAmount: Math.round((netAmount + vatAmount) * 100) / 100,
    vatRate,
    vatType: vatRate > 0 ? 'standard' : 'zero_rated',
  };
};

// ─── Partner: Start Stripe Connect onboarding ────────────────────────────────
export const startOnboarding = asyncHandler(async (req, res) => {
  if (!stripe) throw new AppError('Stripe nicht konfiguriert', 500);
  const userResult = await query(
    'SELECT id, stripe_account_id, first_name, last_name, email, country FROM users WHERE id = $1',
    [req.user.id]
  );
  const user = userResult.rows[0];
  if (!user) throw new AppError('Benutzer nicht gefunden', 404);

  let accountId = user.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: user.country || 'AT',
      email: user.email,
      capabilities: { transfers: { requested: true }, card_payments: { requested: false } },
      business_type: 'individual',
      individual: { first_name: user.first_name, last_name: user.last_name, email: user.email },
      settings: { payouts: { schedule: { interval: 'manual' } } },
    });
    accountId = account.id;
    await query('UPDATE users SET stripe_account_id = $1 WHERE id = $2', [accountId, user.id]);
  }
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${FRONTEND_URL}/dashboard/profile?stripe=refresh`,
    return_url:  `${FRONTEND_URL}/dashboard/profile?stripe=success`,
    type: 'account_onboarding',
  });
  res.json({ url: accountLink.url });
});

// ─── Partner: Get Stripe Connect status ──────────────────────────────────────
export const getConnectStatus = asyncHandler(async (req, res) => {
  if (!stripe) return res.json({ connected: false, needsSetup: true });
  const userResult = await query('SELECT stripe_account_id FROM users WHERE id = $1', [req.user.id]);
  const accountId = userResult.rows[0]?.stripe_account_id;
  if (!accountId) return res.json({ connected: false, needsSetup: true });
  try {
    const account = await stripe.accounts.retrieve(accountId);
    res.json({
      connected: !!(account.details_submitted && account.charges_enabled),
      payoutsEnabled: !!account.payouts_enabled,
      needsSetup: !account.details_submitted,
      requirements: account.requirements?.currently_due || [],
      accountId,
    });
  } catch (e) {
    res.json({ connected: false, needsSetup: true, error: e.message });
  }
});

// ─── Partner: Get Stripe dashboard link ──────────────────────────────────────
export const getConnectDashboardLink = asyncHandler(async (req, res) => {
  if (!stripe) throw new AppError('Stripe nicht konfiguriert', 500);
  const userResult = await query('SELECT stripe_account_id FROM users WHERE id = $1', [req.user.id]);
  const accountId = userResult.rows[0]?.stripe_account_id;
  if (!accountId) throw new AppError('Kein Stripe-Konto verknüpft', 404);
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  res.json({ url: loginLink.url });
});

// ─── Admin: Get payout history ────────────────────────────────────────────────
export const getPayoutHistory = asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT p.*, u.first_name, u.last_name, u.email
    FROM payouts p JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC LIMIT 200
  `);
  res.json({ payouts: result.rows });
});

// ─── Admin: Manual trigger ────────────────────────────────────────────────────
export const processStripePayouts = asyncHandler(async (req, res) => {
  const result = await runStripePayouts();
  res.json(result);
});

// ─── CORE: Automatic payout engine ───────────────────────────────────────────
export const runStripePayouts = async () => {
  const L = (msg) => console.log(`[PAYOUT] ${msg}`);
  const E = (msg) => console.error(`[PAYOUT ERROR] ${msg}`);

  L('='.repeat(60));
  L(`Starting payout cycle at ${new Date().toISOString()}`);
  L(`Stripe configured: ${!!stripe}`);
  L(`Node env: ${process.env.NODE_ENV}`);
  L('='.repeat(60));

  const summary = { processed: 0, pending: 0, skipped: 0, failed: 0, totalGross: 0, details: [] };

  // Step 1: Check released commissions
  let partners;
  try {
    const result = await query(`
      SELECT
        u.id, u.first_name, u.last_name, u.email,
        u.stripe_account_id, u.vat_id, u.country, u.status as user_status,
        COALESCE(SUM(c.amount), 0)::numeric AS net_amount,
        COUNT(c.id) as commission_count
      FROM users u
      JOIN commissions c ON c.user_id = u.id AND c.status = 'released' AND c.type <> 'bonus_pool'
        AND (c.held_until IS NULL OR c.held_until < NOW() - INTERVAL '1 hour')
      WHERE u.role IN ('partner', 'admin')
        AND u.status = 'active'
        AND LOWER(u.email) <> 'technik@clyr.shop'
      GROUP BY u.id, u.first_name, u.last_name, u.email,
               u.stripe_account_id, u.vat_id, u.country, u.status
      HAVING COALESCE(SUM(c.amount), 0) >= 10
    `);
    partners = result.rows;
    L(`Found ${partners.length} partner(s) with released commissions >= €10`);
    partners.forEach(p => {
      L(`  → ${p.first_name} ${p.last_name} (${p.email}): €${p.net_amount} across ${p.commission_count} commissions, Stripe: ${p.stripe_account_id || 'NONE'}`);
    });
  } catch (err) {
    E(`DB query failed: ${err.message}`);
    E(err.stack);
    throw err;
  }

  // Step 2: Also log ALL commissions for debugging
  try {
    const allComm = await query(`
      SELECT u.email, c.status, c.amount, c.held_until, c.released_at
      FROM commissions c JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC LIMIT 20
    `);
    L('Last 20 commissions in DB:');
    allComm.rows.forEach(r => {
      L(`  ${r.email}: €${r.amount} status=${r.status} held_until=${r.held_until} released=${r.released_at}`);
    });
  } catch(e) { E(`Debug query failed: ${e.message}`); }

  if (partners.length === 0) {
    L('No released commissions >= €10 found. Nothing to pay.');
    L('Check: have commissions been released? Run release manually in Admin → Provisionen → Freigeben');
    return summary;
  }

  // Step 3: Process each partner
  for (const p of partners) {
    const name = `${p.first_name} ${p.last_name}`;
    const netAmount = parseFloat(p.net_amount);
    const vatInfo = calculateAffiliateCommissionVat(p, netAmount);
    const vatAmount = vatInfo.vatAmount;
    const grossAmount = vatInfo.grossAmount;
    // Per-day (not per-month) reference: Theresa runs two legitimate payout
    // cycles a month (1st and 15th), so the dedupe key must distinguish those
    // two runs from each other while still blocking any accidental duplicate
    // execution within the same cycle (e.g. a restart racing the cron).
    const payoutReference = `AUTO-${new Date().toISOString().slice(0,10)}-${p.id.slice(0,8)}`;

    L(`Processing ${name}: net=€${netAmount} vat=€${vatAmount} gross=€${grossAmount}`);

    // Declared outside the try block (not just inside it) so the outer
    // catch below can still see them — `let`/`const` inside a try block
    // is NOT visible in its catch block in JS.
    let claimedPayoutId;
    let capturedTransferId = null; // set the moment a real Stripe transfer is created, so the catch block can flag it even if the DB transaction later rolls back

    try {
      // ── Claim the payout slot FIRST, before any Stripe call ──
      // The (user_id, reference) unique index (see
      // migration_fix_double_payout_july2026.sql) makes this
      // insert fail if a payout for this partner+month already
      // exists and is still active. This closes the race where
      // two concurrent runs (overlapping cron, admin retry, a
      // server restart mid-cycle) both read the same "released"
      // commissions before either had committed.
      const statementNumber = await generateStatementNumber();
      try {
        const claim = await query(
          `INSERT INTO payouts (
             user_id, net_amount, vat_amount, gross_amount,
             method, status, reference, statement_number
           ) VALUES ($1, $2, $3, $4, 'sepa', 'processing', $5, $6)
           RETURNING id`,
          [p.id, netAmount, vatAmount, grossAmount, payoutReference, statementNumber]
        );
        claimedPayoutId = claim.rows[0].id;
        L(`  Claimed payout slot ${claimedPayoutId} (reference=${payoutReference})`);
      } catch (claimErr) {
        if (claimErr.code === '23505') {
          L(`  Active payout already exists for this reference; skipping duplicate.`);
          summary.skipped++;
          summary.details.push({ name, email: p.email, netAmount, vatAmount, grossAmount, status: 'duplicate_skipped' });
          continue;
        }
        throw claimErr;
      }

      await transaction(async (client) => {
        let method = 'sepa';
        let status = 'pending';
        let stripeTransferId = null;
        let payoutSucceeded = false;

        if (stripe && p.stripe_account_id) {
          L(`  Checking Stripe account ${p.stripe_account_id}...`);
          try {
            const account = await stripe.accounts.retrieve(p.stripe_account_id);
            L(`  Stripe account: payouts_enabled=${account.payouts_enabled}, charges_enabled=${account.charges_enabled}, details_submitted=${account.details_submitted}`);

            if (account.payouts_enabled) {
              const cents = Math.round(grossAmount * 100);
              const monthLabel = new Date().toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });

              // APPROACH: Create payout directly on connected account using their bank
              // This bypasses the platform balance issue entirely
              // The connected account's bank account (IBAN) receives the payout
              try {
                // Step 1: Top-up the connected account via Stripe transfer
                // Use the platform's Stripe key with stripeAccount header
                // First try direct payout on connected account (if it has any balance)
                
                // Get the connected account's external bank account
                const extAccounts = await stripe.accounts.listExternalAccounts(
                  p.stripe_account_id,
                  { object: 'bank_account', limit: 1 }
                );
                
                if (extAccounts.data.length === 0) {
                  throw new Error('No bank account found on connected Stripe account');
                }
                
                const bankAccount = extAccounts.data[0];
                L(`  Connected bank: ${bankAccount.bank_name} ...${bankAccount.last4} (${bankAccount.currency})`);

                // Try transfer first (works if platform has balance)
                let transferId = null;
                try {
                  const transfer = await stripe.transfers.create({
                    amount: cents,
                    currency: 'eur',
                    destination: p.stripe_account_id,
                    description: `CLYR Provision ${monthLabel}`,
                    metadata: { partner_id: p.id, net: netAmount.toString(), vat: vatAmount.toString() },
                  });
                  transferId = transfer.id;
                  capturedTransferId = transferId;
                  L(`  Transfer created: ${transferId}`);

                  // Payout from connected account to their bank
                  await stripe.payouts.create(
                    { amount: cents, currency: 'eur', method: 'standard' },
                    { stripeAccount: p.stripe_account_id }
                  );
                  L(`  ✅ Stripe transfer + payout created for ${name}`);
                } catch (transferErr) {
                  L(`  Transfer failed (${transferErr.message}) — trying top-up approach`);
                  
                  // Platform has no balance — create a top-up to fund the transfer
                  try {
                    const topup = await stripe.topups.create({
                      amount: cents,
                      currency: 'eur',
                      description: `Top-up for CLYR Provision ${monthLabel} — ${name}`,
                      statement_descriptor: 'CLYR Provision',
                    });
                    L(`  Top-up created: ${topup.id} status=${topup.status}`);
                    
                    // Transfer after top-up (may be instant or queued)
                    const transfer2 = await stripe.transfers.create({
                      amount: cents,
                      currency: 'eur', 
                      destination: p.stripe_account_id,
                      description: `CLYR Provision ${monthLabel}`,
                      metadata: { partner_id: p.id, topup: topup.id },
                    });
                    transferId = transfer2.id;
                    capturedTransferId = transferId;
                    L(`  Transfer after top-up: ${transferId}`);
                    
                    await stripe.payouts.create(
                      { amount: cents, currency: 'eur', method: 'standard' },
                      { stripeAccount: p.stripe_account_id }
                    );
                    L(`  ✅ Top-up + transfer + payout created for ${name}`);
                  } catch (topupErr) {
                    E(`  Top-up also failed: ${topupErr.message}`);
                    throw topupErr;
                  }
                }

                method = 'stripe';
                status = 'processing';
                stripeTransferId = transferId;
                payoutSucceeded = true;
                summary.processed++;
                summary.totalGross += grossAmount;

              } catch (payoutErr) {
                E(`  Payout failed for ${name}: ${payoutErr.message}`);
                L(`  → Recording as pending. Manual SEPA transfer of €${grossAmount.toFixed(2)} required.`);
                summary.skipped++;
              }
            } else {
              L(`  ⚠️ Stripe payouts NOT enabled for ${name} → recording as pending`);
              if (account.requirements?.currently_due?.length > 0) {
                L(`  Requirements due: ${account.requirements.currently_due.join(', ')}`);
              }
              summary.skipped++;
            }
          } catch (stripeErr) {
            E(`  Stripe account error for ${name}: ${stripeErr.message}`);
            summary.skipped++;
          }
        } else if (p.iban) {
          // Partner has IBAN stored but no Stripe Connect — record for manual SEPA
          L(`  No Stripe Connect for ${name} but IBAN on file → recording pending SEPA`);
          summary.pending++;
        } else {
          L(`  No Stripe account and no IBAN for ${name} → recording as pending`);
          summary.pending++;
        }

        // Update the payout row we already claimed above (before the
        // Stripe call). We never insert a second payout row here —
        // that duplicate insert, combined with a reference that
        // didn't match the dedupe check, was the root cause of
        // partners being paid twice.
        L(`  Updating claimed payout ${claimedPayoutId}: method=${method} status=${status} net=${netAmount} gross=${grossAmount}`);
        await client.query(
          `UPDATE payouts
           SET method = $1, status = $2, stripe_transfer_id = $3
           WHERE id = $4`,
          [method, status, stripeTransferId, claimedPayoutId]
        );

        if (payoutSucceeded) {
          // Mark commissions as paid only after a successful Stripe payout flow,
          // and link them to the payout we claimed so they can't be picked up
          // again by a later run.
          const updateResult = await client.query(`
            UPDATE commissions
            SET status = 'paid', paid_at = CURRENT_TIMESTAMP, payout_id = $2
            WHERE user_id = $1 AND status = 'released' AND type <> 'bonus_pool'
              AND (held_until IS NULL OR held_until < NOW() - INTERVAL '1 hour')
            RETURNING id
          `, [p.id, claimedPayoutId]);
          L(`  Marked ${updateResult.rowCount} commissions as paid`);

          // Deduct from wallet after payout succeeds
          await client.query(
            `UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - $1) WHERE id = $2`,
            [netAmount, p.id]
          );
        } else {
          L(`  Commissions left in released state for retry/manual payout`);
        }
        L(`  ✅ Done: ${name} — ${status}`);
        summary.details.push({ name, email: p.email, netAmount, vatAmount, grossAmount, status });
      });

    } catch (err) {
      summary.failed++;
      E(`❌ Transaction FAILED for ${name}: ${err.message}`);
      E(err.stack);
      // The Stripe call (if it happened) is external and cannot be rolled
      // back, but the claimed payout row is separate from the failed
      // transaction above and must not be left stuck on 'processing' —
      // otherwise the unique index would permanently block any retry
      // this month even though no money actually moved on our side.
      if (claimedPayoutId) {
        const failureNote = capturedTransferId
          ? `⚠️ MANUAL REVIEW NEEDED: a Stripe transfer (${capturedTransferId}) may have already gone out before this error — check the Stripe dashboard before retrying. Error: ${err.message}`
          : (err.message?.slice(0, 500) || 'unknown error');
        try {
          await query(
            `UPDATE payouts SET status = 'failed', failure_reason = $1, stripe_transfer_id = COALESCE(stripe_transfer_id, $3) WHERE id = $2 AND status = 'processing'`,
            [failureNote.slice(0, 900), claimedPayoutId, capturedTransferId]
          );
          if (capturedTransferId) {
            E(`  🚨 Transfer ${capturedTransferId} may have succeeded before the DB error — flagged payout ${claimedPayoutId} for manual review.`);
          }
        } catch (cleanupErr) {
          E(`  Failed to mark claimed payout ${claimedPayoutId} as failed: ${cleanupErr.message}`);
        }
      }
      summary.details.push({ name, email: p.email, netAmount, grossAmount, status: 'error', error: err.message });
    }
  }

  L('='.repeat(60));
  L(`CYCLE COMPLETE: ${summary.processed} paid via Stripe, ${summary.pending} pending manual, ${summary.skipped} Stripe not ready, ${summary.failed} errors`);
  L(`Total gross paid: €${summary.totalGross.toFixed(2)}`);
  L('='.repeat(60));
  return summary;
};

// ─── Admin: Diagnose current payout state ────────────────────────────────────
export const diagnosePayouts = asyncHandler(async (req, res) => {
  // Check commission status
  const commResult = await query(`
    SELECT 
      u.email, u.first_name, u.last_name,
      u.stripe_account_id,
      c.status, c.amount, c.held_until, c.released_at, c.paid_at,
      c.type, c.created_at
    FROM commissions c
    JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC
    LIMIT 50
  `);

  // Summary by status
  const summaryResult = await query(`
    SELECT 
      c.status,
      COUNT(*) as count,
      COALESCE(SUM(c.amount), 0) as total
    FROM commissions c
    GROUP BY c.status
  `);

  // Partners with wallet balance
  const walletResult = await query(`
    SELECT u.email, u.first_name, u.last_name, u.wallet_balance,
           u.stripe_account_id,
           (SELECT COUNT(*) FROM commissions WHERE user_id = u.id AND status = 'released' AND type <> 'bonus_pool') as released_count
    FROM users u
    WHERE u.role IN ('partner', 'admin')
      AND u.wallet_balance > 0
      AND LOWER(u.email) <> 'technik@clyr.shop'
    ORDER BY u.wallet_balance DESC
  `);

  // Recent payouts
  const payoutResult = await query(`
    SELECT p.*, u.email, u.first_name, u.last_name
    FROM payouts p JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC LIMIT 10
  `);

  res.json({
    stripe_configured: !!stripe,
    stripe_key_prefix: process.env.STRIPE_SECRET_KEY?.slice(0, 7) || 'NOT SET',
    commission_summary: summaryResult.rows,
    partners_with_balance: walletResult.rows,
    recent_commissions: commResult.rows,
    recent_payouts: payoutResult.rows,
    server_time: new Date().toISOString(),
    next_payout_cron: '0 3 1 * * (1st of month at 3am server time)',
  });
});

// ─── Admin: Force release + pay now ──────────────────────────────────────────
export const releaseAndPay = asyncHandler(async (req, res) => {
  console.log('[MANUAL TRIGGER] Admin triggered release-and-pay');

  // Step 1: Release commissions whose 14-day hold has actually elapsed.
  // This previously released ALL held commissions regardless of held_until,
  // which is why commissions from purchases made just days earlier were
  // showing up in commission statements before the mandatory 14-day
  // waiting period had passed. Use the same rule as the daily cron.
  const forceOverride = req.query?.force === 'true' || req.body?.force === true;
  let releasedRows;
  if (forceOverride) {
    // Explicit opt-in escape hatch only, e.g. ?force=true — still logged clearly.
    console.warn('[MANUAL TRIGGER] force=true — bypassing 14-day hold as explicitly requested');
    const releaseResult = await query(`
      UPDATE commissions
      SET status = 'released', released_at = CURRENT_TIMESTAMP
      WHERE status = 'held'
        AND type <> 'bonus_pool'
      RETURNING id, user_id, amount
    `);
    releasedRows = releaseResult.rows;
    for (const comm of releasedRows) {
      await query(
        `UPDATE users SET wallet_balance = wallet_balance + $1, total_earned = total_earned + $1 WHERE id = $2`,
        [comm.amount, comm.user_id]
      );
    }
  } else {
    releasedRows = await releaseHeldCommissions();
  }
  console.log(`[MANUAL TRIGGER] Released ${releasedRows.length} commissions${forceOverride ? ' (14-day hold bypassed)' : ' (14-day hold respected)'}`);

  // Step 2: Run payout cycle
  const payoutResult = await runStripePayouts();

  res.json({
    released: releasedRows.length,
    force_released: releasedRows.length, // kept for backward compatibility with existing frontend
    hold_bypassed: forceOverride,
    payout_result: payoutResult,
    message: `Released ${releasedRows.length} commissions${forceOverride ? ' (14-day hold bypassed)' : ''} and processed payouts`,
  });
});
