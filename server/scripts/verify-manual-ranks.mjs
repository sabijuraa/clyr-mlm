// node --experimental-test-module-mocks --test scripts/verify-manual-ranks.mjs
// Uses isolated database/email doubles; never reads production credentials.
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

const ranks = [
  { id: 2, level: 1, name: 'Starter' },
  { id: 3, level: 2, name: 'Berater' },
  { id: 4, level: 3, name: 'Fachberater' },
];
let user, events, failAudit, raceWithAdmin, rankQueries;
const query = async (sql, params = []) => {
  if (sql.startsWith('SELECT * FROM ranks WHERE id')) return { rows: ranks.filter(rank => rank.id === params[0]) };
  if (sql.includes('SELECT u.*, r.level as current_level')) {
    return { rows: [{ ...user, current_level: ranks.find(rank => rank.id === user.rank_id).level }] };
  }
  if (sql.includes('SELECT * FROM ranks WHERE level <= 6')) { rankQueries++; return { rows: ranks }; }
  if (sql.includes('FROM monthly_sales_snapshots')) return { rows: [] };
  if (sql.includes('FROM users u') && sql.includes('r.level > 2')) {
    assert.match(sql, /u.manual_rank_override = false/);
    return { rows: user.manual_rank_override ? [] : [{ ...user, level: 3, rank_name: 'Fachberater' }] };
  }
  if (sql.includes('SELECT id FROM ranks WHERE level = 2')) return { rows: [{ id: 3 }] };
  if (sql.includes('UPDATE users SET rank_id')) {
    if (sql.includes('manual_rank_override = $3')) {
      if (params[1] !== user.id) return { rows: [], rowCount: 0 };
      user.rank_id = params[0];
      user.manual_rank_override = params[2];
      return { rows: [{ ...user }], rowCount: 1 };
    }
    assert.match(sql, /manual_rank_override = false/);
    if (raceWithAdmin) { user.rank_id = 2; user.manual_rank_override = true; }
    const observedRank = sql.includes('highest_rank_level') ? params[3]
      : sql.includes('SELECT id FROM ranks WHERE level') ? ranks.find(rank => rank.level === params[2]).id : params[2];
    if (user.manual_rank_override || user.rank_id !== observedRank) return { rows: [], rowCount: 0 };
    user.rank_id = params[0];
    return { rows: [], rowCount: 1 };
  }
  if (sql.includes('INSERT INTO activity_log')) {
    if (failAudit) throw new Error('audit unavailable');
    events.push(params);
    return { rows: [], rowCount: 1 };
  }
  throw new Error(`Unexpected query: ${sql}`);
};
mock.module(new URL('../src/config/database.js', import.meta.url).href, { namedExports: {
  query,
  transaction: async callback => {
    const snapshot = { ...user };
    try { return await callback({ query }); }
    catch (error) { user = snapshot; throw error; }
  },
} });
mock.module(new URL('../src/services/email.service.js', import.meta.url).href, { namedExports: {
  sendEmail: async () => { throw new Error('Rank changes must not send status emails'); },
} });
const { updatePartnerRank } = await import('../src/controllers/admin.controller.js');
const { checkAndUpdateRank, checkRankDecay } = await import('../src/services/commission.service.js');
const saveRank = (body, id = 'partner') => new Promise((resolve, reject) => {
  updatePartnerRank({ params: { id }, body, user: { id: 'admin' } }, { json: resolve }, reject);
});
beforeEach(() => {
  user = { id: 'partner', rank_id: 3, role: 'partner', own_sales_count: 7, has_own_machine: true, manual_rank_override: false };
  events = [];
  rankQueries = 0;
  failAudit = raceWithAdmin = false;
});

test('manual Starter selection saves successfully and survives repeated automatic checks', async () => {
  const response = await saveRank({ rankId: 2 });
  assert.equal(response.partner.rank_id, 2);
  assert.equal(response.partner.manual_rank_override, true);
  for (let i = 0; i < 3; i++) assert.equal(await checkAndUpdateRank(user.id), null);
  assert.equal(user.rank_id, 2);
  assert.equal(rankQueries, 0);
  assert.equal(events.length, 1);
  assert.equal(JSON.parse(events[0][4]).manualOverride, true);
});
test('automatic qualification still promotes partners without a manual override', async () => {
  user.rank_id = 2;
  user.has_own_machine = false;
  assert.deepEqual(await checkAndUpdateRank(user.id), { newRankLevel: 2, reason: 'qualification' });
  assert.equal(user.rank_id, 3);
});
test('machine owners still promote automatically when no override is set', async () => {
  user.rank_id = 2;
  assert.deepEqual(await checkAndUpdateRank(user.id), { newRankLevel: 2, reason: 'machine_owner' });
  assert.equal(user.rank_id, 3);
});
test('admin can explicitly restore automatic progression', async () => {
  await saveRank({ rankId: 2 });
  await saveRank({ rankId: 2, manualOverride: false });
  assert.equal(user.manual_rank_override, false);
  await checkAndUpdateRank(user.id);
  assert.equal(user.rank_id, 3);
});
test('a simultaneous manual change wins over a stale qualification check', async () => {
  user.rank_id = 2;
  user.has_own_machine = false;
  raceWithAdmin = true;
  assert.equal(await checkAndUpdateRank(user.id), null);
  assert.equal(user.rank_id, 2);
  assert.equal(events.length, 0);
});
test('a simultaneous manual change wins over a stale machine-owner check', async () => {
  user.rank_id = 2;
  raceWithAdmin = true;
  assert.equal(await checkAndUpdateRank(user.id), null);
  assert.equal(user.rank_id, 2);
  assert.equal(events.length, 0);
});
test('monthly decay does not alter manually assigned ranks', async () => {
  user.rank_id = 4;
  user.manual_rank_override = true;
  assert.deepEqual(await checkRankDecay(), []);
  assert.equal(user.rank_id, 4);
});
test('decay still applies in automatic mode, but respects a concurrent manual change', async () => {
  user.rank_id = 4;
  assert.equal((await checkRankDecay()).length, 1);
  assert.equal(user.rank_id, 3);
  user.rank_id = 4;
  raceWithAdmin = true;
  assert.deepEqual(await checkRankDecay(), []);
  assert.equal(user.rank_id, 2);
});
test('invalid rank or override input cannot change the partner', async () => {
  await assert.rejects(saveRank({ rankId: 999 }), error => error.statusCode === 404);
  await assert.rejects(saveRank({ rankId: '2' }), error => error.statusCode === 400);
  await assert.rejects(saveRank({ rankId: 2, manualOverride: 'false' }), error => error.statusCode === 400);
  await assert.rejects(saveRank({ rankId: 2 }, 'missing'), error => error.statusCode === 404);
  assert.equal(user.rank_id, 3);
});
test('audit failure rolls back the entire admin rank change', async () => {
  failAudit = true;
  await assert.rejects(saveRank({ rankId: 2 }), /audit unavailable/);
  assert.equal(user.rank_id, 3);
  assert.equal(user.manual_rank_override, false);
});
