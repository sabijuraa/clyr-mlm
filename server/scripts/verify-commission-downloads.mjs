import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { getCommissionStatementRequest } from '../../client/src/utils/commissionStatement.js';

let queries, rendered, rows;
const query = async (sql, params) => {
  queries.push({ sql, params });
  assert.ok(!/\b(INSERT|UPDATE|DELETE)\b/.test(sql), 'Downloads must not change financial records');
  if (sql.includes('FROM commissions c')) return { rows };
  if (sql.includes('FROM users')) return { rows: [{ id: 'partner', last_name: 'Example' }] };
  if (sql.includes('FROM payouts')) return { rows: [] };
  throw new Error('Unexpected query');
};
mock.module(new URL('../src/config/database.js', import.meta.url).href, { defaultExport: { query }, namedExports: { query, transaction: () => { throw new Error('No writes expected'); } } });
mock.module(new URL('../src/services/invoice.service.js', import.meta.url).href, { namedExports: {
  generateCommissionPreview: async (...args) => { rendered = { mode: 'preview', args }; return Buffer.from('%PDF-preview'); },
  generateCommissionStatement: async (...args) => { rendered = { mode: 'statement', args }; return Buffer.from('%PDF-statement'); },
} });
const { generateStatementForPartner } = await import('../src/controllers/commission.controller.js');
const download = body => new Promise((resolve, reject) => {
  const headers = {};
  generateStatementForPartner({ body }, { setHeader: (key, value) => { headers[key] = value; }, send: buffer => resolve({ headers, buffer }) }, reject);
});
beforeEach(() => { queries = []; rendered = null; rows = [{ order_number: 'TEST', amount: '9.00', status: 'held' }]; });

test('clicked row selects its own month even when another row belongs to the same partner', () => {
  const september = { user_id: 'partner', order_date: '2026-09-01T00:00:00+02:00', created_at: '2026-10-29', status: 'paid' };
  const october = { user_id: 'partner', order_date: '2026-10-22T12:00:00Z', status: 'held' };
  assert.deepEqual(getCommissionStatementRequest(september), { partnerId: 'partner', period: '2026-09', preview: false });
  assert.deepEqual(getCommissionStatementRequest(october), { partnerId: 'partner', period: '2026-10', preview: true });
});
test('pending rows request a preview and missing order dates fall back to commission dates', () => {
  assert.deepEqual(getCommissionStatementRequest({ user_id: 'partner', created_at: '2026-08-15', status: 'pending' }), { partnerId: 'partner', period: '2026-08', preview: true });
  assert.throws(() => getCommissionStatementRequest({}), /Invalid commission date/);
});
test('held preview downloads include all non-cancelled statuses without payout queries', async () => {
  const response = await download({ partnerId: 'partner', period: '2026-10', preview: true });
  assert.equal(rendered.mode, 'preview');
  assert.deepEqual(queries[0].params[3], ['held', 'pending', 'released', 'paid']);
  assert.equal(queries.some(item => item.sql.includes('FROM payouts')), false);
  assert.match(response.headers['Content-Disposition'], /Provisionsvorschau-2026-10.pdf/);
  assert.equal(response.headers['Content-Type'], 'application/pdf');
});
test('regular statements remain restricted to released and paid commissions', async () => {
  await download({ partnerId: 'partner', period: '2026-09' });
  assert.deepEqual(queries[0].params[3], ['released', 'paid']);
  assert.equal(rendered.mode, 'statement');
});
test('invalid month or preview value fails before any database access', async () => {
  for (const body of [{ period: '2026-13' }, { period: '2026-00' }, { period: '2026-10', preview: 'true' }]) {
    await assert.rejects(download({ partnerId: 'partner', ...body }), error => error.statusCode === 400);
  }
  assert.equal(queries.length, 0);
});
test('empty periods return 404 without generating a misleading PDF', async () => {
  rows = [];
  await assert.rejects(download({ partnerId: 'partner', period: '2026-10', preview: true }), error => error.statusCode === 404);
  assert.equal(rendered, null);
});
