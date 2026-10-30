import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCommissionAuditSnapshot } from '../src/services/commission-audit.service.js';

test('audit snapshot enforces a consistent read-only transaction and excludes credentials/bank details', async () => {
  const queries = [];
  const snapshot = await getCommissionAuditSnapshot({ query: async sql => {
    queries.push(sql);
    assert.ok(sql.startsWith('SELECT') || sql.startsWith('SET TRANSACTION'));
    assert.doesNotMatch(sql, /password|iban|bic|account_holder|stripe_account_id|SELECT \*/i);
    return { rows: [] };
  } });
  assert.match(queries[0], /REPEATABLE READ, READ ONLY/);
  assert.equal(snapshot.readOnly, true);
  for (const field of ['users','ranks','orders','commissions','payouts','activities']) assert.deepEqual(snapshot[field], []);
});
test('audit failures propagate instead of producing a partial report', async () => {
  await assert.rejects(getCommissionAuditSnapshot({ query: async () => { throw new Error('unavailable'); } }), /unavailable/);
});
