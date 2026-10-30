import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

mock.module(new URL('../src/config/database.js', import.meta.url).href, { namedExports: {
  query: async () => ({ rows: [{ id: 'seller', manual_rank_override: true, current_level: 1 }] }),
  transaction: () => { throw new Error('Unexpected transaction'); },
} });
const { calculateCommissions } = await import('../src/services/commission.service.js');
let commissions, active;
beforeEach(() => { commissions = []; active = true; });
const client = { query: async (sql, params = []) => {
  if (sql.includes('SELECT *') && sql.includes('FROM commissions')) return { rows: commissions };
  if (sql.includes('FROM settings')) return { rows: [] };
  if (sql.includes('SELECT created_at FROM orders')) return { rows: [{ created_at: '2026-10-30T12:00:00Z' }] };
  if (sql.includes('SELECT u.*, r.commission_rate')) return { rows: [{ id: 'seller', email: 'seller@example.test', commission_rate: '8.00' }] };
  if (sql.includes('SELECT u.id, u.upline_id')) return { rows: params[0] === 'seller' ? [{ id: 'upline', commission_rate: '31.00', email: 'upline@example.test' }] : [] };
  if (sql.includes('SELECT COUNT(*) as sales_count')) return { rows: [{ sales_count: active ? '2' : '0' }] };
  if (sql.includes('INSERT INTO commissions')) {
    const direct = sql.includes("'direct'");
    const commission = { user_id: params[0], type: direct ? 'direct' : 'difference', amount: params[2], rate: params[3], status: 'held' };
    commissions.push(commission);
    return { rows: [commission] };
  }
  if (sql.includes('SELECT upline_id FROM users')) return { rows: params[0] === 'seller' ? [{ upline_id: 'upline' }] : [] };
  if (sql.includes('SELECT role, email')) return { rows: [{ role: 'partner', email: 'seller@example.test' }] };
  if (sql.includes('active_direct') || sql.includes('SELECT COUNT(*) as count FROM users')) return { rows: [{ count: '0' }] };
  if (/UPDATE users|INSERT INTO monthly_sales_snapshots/.test(sql)) return { rows: [] };
  throw new Error(`Unexpected query: ${sql}`);
} };

test('normal orders with no historical cap pay the eligible upline difference', async () => {
  await calculateCommissions(client, 'order', 'seller', 112.50);
  assert.deepEqual(commissions.map(c => [c.type, c.rate, c.amount]), [['direct', '8.00', 9], ['difference', 23, 25.88]]);
});
test('explicit historical cap still limits upline rates', async () => {
  await calculateCommissions(client, 'order', 'seller', 112.50, 0, 25);
  assert.equal(commissions.find(c => c.type === 'difference').rate, 17);
  assert.equal(commissions.find(c => c.type === 'difference').amount, 19.13);
});
test('explicit zero cap and inactive uplines do not earn a difference', async () => {
  await calculateCommissions(client, 'order', 'seller', 112.50, 0, 0);
  assert.equal(commissions.length, 1);
  commissions = []; active = false;
  await calculateCommissions(client, 'order', 'seller', 112.50);
  assert.equal(commissions.length, 1);
});
test('existing commission rows prevent duplicates and are never retroactively changed', async () => {
  commissions = [{ type: 'direct', amount: 9 }];
  await calculateCommissions(client, 'order', 'seller', 112.50);
  assert.deepEqual(commissions, [{ type: 'direct', amount: 9 }]);
});
