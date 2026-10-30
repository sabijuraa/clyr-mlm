// Evidence export only. Keep this separate from commission calculation/repair
// so reviewing an order can never create commissions or trigger a payout.
export const getCommissionAuditSnapshot = async (client) => {
  await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
  const users = await client.query(`SELECT id, first_name, last_name, email, role, status,
    upline_id, rank_id, manual_rank_override, rank_achieved_at, created_at
    FROM users ORDER BY created_at, id`);
  const ranks = await client.query('SELECT id, name, level, commission_rate FROM ranks ORDER BY level');
  const orders = await client.query(`SELECT id, order_number, partner_id, created_at, updated_at,
    subtotal, discount_amount, total, status, payment_status
    FROM orders ORDER BY created_at, id`);
  const commissions = await client.query(`SELECT id, user_id, order_id, type, amount, rate,
    base_amount, source_user_id, status, payout_id, held_until, released_at, paid_at,
    cancelled_at, description, created_at, updated_at
    FROM commissions WHERE type <> 'bonus_pool' ORDER BY created_at, id`);
  const payouts = await client.query(`SELECT id, user_id, net_amount, vat_amount, gross_amount,
    status, method, reference, statement_number, period_start, period_end,
    processed_at, completed_at, created_at
    FROM payouts ORDER BY created_at, id`);
  const activities = await client.query(`SELECT id, user_id, action, entity_id, details, created_at
    FROM activity_log WHERE action IN
    ('partner_rank_updated', 'rank_upgraded', 'rank_downgraded', 'order_financials_repaired')
    ORDER BY created_at, id`);
  return {
    exportedAt: new Date().toISOString(), readOnly: true,
    limitations: [
      'Current sponsor links and current rank rates are not proof of historical settings.',
      'Rank/sponsor history may be incomplete; review unresolved evidence before any adjustment.',
      'Paid ledger status is not independent confirmation of a bank or Stripe transfer.',
    ],
    users: users.rows, ranks: ranks.rows, orders: orders.rows,
    commissions: commissions.rows, payouts: payouts.rows, activities: activities.rows,
  };
};
