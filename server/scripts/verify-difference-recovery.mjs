import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { recoverApprovedDifferences, DIFFERENCE_RECOVERY_PLAN } from '../src/services/difference-recovery.service.js';

const plan = [
  ['FL26100006', 48, 19, 'diana', '2026-10-13T12:07:55Z'],
  ['FL26100009', 337.5, 8, 'rebekka', '2026-10-28T21:44:00Z'],
  ['FL26100022', 112.5, 8, 'rebekka', '2026-10-28T21:43:36Z'],
  ['FL26100023', 112.5, 8, 'rebekka', '2026-10-29T17:37:09Z'],
];
let records, logs, queries, changedSponsor, changedBase, historicalCap, failAudit, eligible;
beforeEach(() => { records = []; logs = []; queries = []; changedSponsor = changedBase = failAudit = false; historicalCap = null; eligible = true; });
const client = { query: async (sql, args) => {
  queries.push(sql);
  assert.doesNotMatch(sql, /\b(UPDATE|DELETE)\s+(users|orders|commissions|payouts)\b/i);
  assert.doesNotMatch(sql, /\bFROM payouts\b/i);
  if (sql.includes('pg_advisory_xact_lock')) return { rows: [] };
  if (sql.includes("LOWER(u.email)")) return { rows: [{ id: 'theresa', commission_rate: '31.00' }] };
  if (sql.includes('FROM orders o JOIN users')) {
    const item = plan.find(p => p[0] === args[0]);
    return { rows: [{ id: item[0], order_number: item[0], partner_id: item[3], payment_status: 'paid', status: 'completed', subtotal: changedBase ? 1 : item[1], discount_amount: 0, upline_id: changedSponsor ? 'other' : 'theresa' }] };
  }
  if (sql.includes("type = 'direct'")) {
    if (sql.includes('COUNT(DISTINCT')) return { rows: [{ count: eligible ? 4 : 1 }] };
    const item = plan.find(p => p[0] === args[0]);
    return { rows: [{ id: 'direct', rate: item[2], amount: Math.round(item[1] * item[2]) / 100, base_amount: item[1], held_until: '2026-11-05T12:00:00Z', created_at: item[4], status: 'held' }] };
  }
  if (sql.includes('SELECT details')) return { rows: [{ details: { historicalCommissionRateCap: historicalCap } }] };
  if (sql.includes("type = 'difference'")) return { rows: records.filter(r => r.order_id === args[0]) };
  if (sql.includes('INSERT INTO commissions')) {
    assert.match(sql, /'held'/);
    const record = { id: `restored-${records.length}`, user_id: args[0], order_id: args[1], amount: args[2], rate: args[3], base_amount: args[4], source_user_id: args[5], status: 'held', held_until: args[6] };
    records.push(record);
    return { rows: [{ id: record.id }] };
  }
  if (sql.includes('INSERT INTO activity_log')) {
    if (failAudit) throw new Error('audit failed');
    logs.push(JSON.parse(args[2]));
    return { rows: [] };
  }
  throw new Error(`Unexpected query: ${sql}`);
} };
// Simulates the controller's enclosing transaction to verify failure behavior.
const run = async apply => {
  const before = structuredClone({ records, logs });
  try { return await recoverApprovedDifferences(client, 'admin', DIFFERENCE_RECOVERY_PLAN, apply); }
  catch (error) { records = before.records; logs = before.logs; throw error; }
};

test('review validates the four approved rows without creating any ledger entries', async () => {
  const result = await run(false);
  assert.equal(result.approvedNet, 135.15);
  assert.equal(result.entries.length, 4);
  assert.equal(records.length, 0);
  assert.ok(!queries.some(sql => sql.includes('INSERT')));
});
test('restoration adds exactly 135.15 held, preserves hold dates, and writes four audit events without payouts', async () => {
  const result = await run(true);
  assert.equal(result.addedNet, 135.15);
  assert.equal(result.paymentInitiated, false);
  assert.deepEqual(records.map(r => r.amount), [5.76, 77.63, 25.88, 25.88]);
  assert.ok(records.every(r => r.status === 'held' && r.held_until === '2026-11-05T12:00:00Z'));
  assert.equal(logs.length, 4);
  assert.ok(logs.every(log => log.paymentInitiated === false));
});
test('repeating the approved repair adds no duplicate commissions or audit entries', async () => {
  await run(true);
  const result = await run(true);
  assert.equal(result.addedNet, 0);
  assert.equal(records.length, 4);
  assert.equal(logs.length, 4);
  assert.match(queries[0], /pg_advisory_xact_lock/);
});
test('changed sponsor, amount, explicit cap, or activity evidence aborts without inserts', async () => {
  for (const kind of ['sponsor', 'base', 'cap', 'activity']) {
    changedSponsor = kind === 'sponsor'; changedBase = kind === 'base'; historicalCap = kind === 'cap' ? 25 : null; eligible = kind !== 'activity';
    await assert.rejects(run(true), error => error.statusCode === 409);
    assert.equal(records.length, 0);
  }
});
test('an existing conflicting or reversed entry prevents automatic restoration', async () => {
  await run(true); records[0].status = 'reversed';
  await assert.rejects(run(true), error => error.statusCode === 409);
  assert.equal(records.length, 4);
});
test('audit failure rolls back newly inserted ledger entries', async () => {
  failAudit = true;
  await assert.rejects(run(true), /audit failed/);
  assert.equal(records.length, 0);
  assert.equal(logs.length, 0);
});
test('unknown plans are rejected before any database access', async () => {
  await assert.rejects(recoverApprovedDifferences(client, 'admin', 'other-plan', true), error => error.statusCode === 400);
  assert.equal(queries.length, 0);
});
