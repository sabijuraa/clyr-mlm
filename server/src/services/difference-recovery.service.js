import { AppError } from '../middleware/error.middleware.js';

// This bounded plan was reviewed against the 30 October audit and approved by
// the beneficiary. It cannot be used to change rates or restore other orders.
export const DIFFERENCE_RECOVERY_PLAN = 'theresa-october-2026-13515';
const PLAN = [
  { order: 'FL26100006', sellerRate: 19, base: 48, difference: 5.76 },
  { order: 'FL26100009', sellerRate: 8, base: 337.50, difference: 77.63 },
  { order: 'FL26100022', sellerRate: 8, base: 112.50, difference: 25.88 },
  { order: 'FL26100023', sellerRate: 8, base: 112.50, difference: 25.88 },
];
const cents = value => Math.round(Number(value) * 100);
const conflict = message => { throw new AppError(message, 409); };

export const recoverApprovedDifferences = async (client, actorId, planId, apply = false) => {
  if (planId !== DIFFERENCE_RECOVERY_PLAN) throw new AppError('Unbekannter Korrekturplan', 400);
  // Serializes repeated/concurrent requests for this exact repair.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [planId]);
  const beneficiaryResult = await client.query(`SELECT u.id, r.commission_rate
    FROM users u JOIN ranks r ON r.id = u.rank_id
    WHERE LOWER(u.email) = 'theresa@clyr.at' FOR SHARE OF u`, []);
  const beneficiary = beneficiaryResult.rows[0];
  if (!beneficiary || Number(beneficiary.commission_rate) !== 31) conflict('Empfänger oder Rang wurde geändert. Erneute Prüfung erforderlich.');
  const reviewed = [];
  for (const planned of PLAN) {
    const orderResult = await client.query(`SELECT o.id, o.order_number, o.partner_id,
      o.payment_status, o.status, o.subtotal, o.discount_amount, o.created_at,
      u.upline_id FROM orders o JOIN users u ON u.id = o.partner_id
      WHERE o.order_number = $1 FOR UPDATE OF o FOR SHARE OF u`, [planned.order]);
    const order = orderResult.rows[0];
    if (!order || order.payment_status !== 'paid' || ['cancelled', 'refunded', 'disputed'].includes(order.status)
      || order.upline_id !== beneficiary.id || cents(order.subtotal) !== cents(planned.base)
      || cents(order.discount_amount || 0) !== 0) conflict(`${planned.order}: Bestell- oder Sponsor-Daten wurden geändert.`);
    const directResult = await client.query(`SELECT id, rate, amount, base_amount, held_until,
      created_at, status FROM commissions WHERE order_id = $1 AND user_id = $2
      AND type = 'direct' AND status NOT IN ('cancelled', 'reversed') FOR UPDATE`, [order.id, order.partner_id]);
    const direct = directResult.rows[0];
    if (directResult.rows.length !== 1 || Number(direct.rate) !== planned.sellerRate
      || cents(direct.base_amount) !== cents(planned.base)
      || cents(direct.amount) !== Math.round(planned.base * planned.sellerRate)
      || !direct.held_until) conflict(`${planned.order}: Direktprovision stimmt nicht mit der Freigabe überein.`);
    // An explicit historical cap overrides ordinary rates and requires a new review.
    const capResult = await client.query(`SELECT details FROM activity_log
      WHERE action = 'order_financials_repaired' AND entity_id = $1
      ORDER BY created_at DESC LIMIT 1`, [order.id]);
    const cap = capResult.rows[0]?.details?.historicalCommissionRateCap;
    if (cap !== null && cap !== undefined && cap !== '') conflict(`${planned.order}: Historische Obergrenze erfordert erneute Prüfung.`);
    const activityResult = await client.query(`SELECT COUNT(DISTINCT o.id)::int AS count
      FROM orders o JOIN commissions c ON c.order_id = o.id AND c.user_id = o.partner_id
      AND c.type = 'direct' AND c.status NOT IN ('cancelled', 'reversed')
      WHERE o.partner_id = $1 AND o.payment_status = 'paid'
      AND o.status NOT IN ('cancelled', 'refunded', 'disputed')
      AND o.created_at >= date_trunc('quarter', $2::timestamp)
      AND o.created_at <= $2 AND c.created_at <= $2`, [beneficiary.id, direct.created_at]);
    if (Number(activityResult.rows[0]?.count) < 2) conflict(`${planned.order}: Aktivitätsnachweis fehlt.`);
    const existingResult = await client.query(`SELECT id, amount, rate, base_amount,
      source_user_id, status, payout_id FROM commissions
      WHERE order_id = $1 AND user_id = $2 AND type = 'difference' FOR UPDATE`, [order.id, beneficiary.id]);
    const existing = existingResult.rows[0];
    if (existingResult.rows.length > 1 || (existing && (
      ['cancelled', 'reversed'].includes(existing.status)
      || cents(existing.amount) !== cents(planned.difference)
      || Number(existing.rate) !== 31 - planned.sellerRate
      || cents(existing.base_amount) !== cents(planned.base)
      || existing.source_user_id !== order.partner_id
    ))) conflict(`${planned.order}: Bereits vorhandene Differenzprovision muss geprüft werden.`);
    reviewed.push({ ...planned, orderId: order.id, sellerId: order.partner_id,
      beneficiaryId: beneficiary.id, heldUntil: direct.held_until,
      existingId: existing?.id || null, status: existing?.status || 'held' });
  }
  // Validate the complete plan before inserting any entry. The caller wraps this
  // function in one database transaction, including the audit trail.
  let addedCents = 0;
  for (const item of reviewed) {
    if (!apply || item.existingId) continue;
    const inserted = await client.query(`INSERT INTO commissions
      (user_id, order_id, type, amount, rate, base_amount, source_user_id,
       status, held_until, description)
      VALUES ($1, $2, 'difference', $3, $4, $5, $6, 'held', $7, $8)
      RETURNING id`, [item.beneficiaryId, item.orderId, item.difference,
      31 - item.sellerRate, item.base, item.sellerId, item.heldUntil,
      `Differenz-Provision (${31 - item.sellerRate}%) - genehmigte Korrektur ${planId}`]);
    item.restoredId = inserted.rows[0].id;
    addedCents += cents(item.difference);
    await client.query(`INSERT INTO activity_log
      (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'difference_commission_restored', 'commission', $2, $3)`,
    [actorId, item.restoredId, JSON.stringify({ planId, order: item.order,
      beneficiaryId: item.beneficiaryId, amount: item.difference, rate: 31 - item.sellerRate,
      status: 'held', heldUntil: item.heldUntil, paymentInitiated: false })]);
  }
  return { planId, applied: apply, approvedNet: 135.15, addedNet: addedCents / 100,
    paymentInitiated: false, entries: reviewed.map(item => ({ order: item.order,
      amount: item.difference, status: item.status, existingId: item.existingId,
      restoredId: item.restoredId || null, heldUntil: item.heldUntil })) };
};
