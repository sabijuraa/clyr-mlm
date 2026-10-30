import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { loadAllTeamMembers } from '../../client/src/utils/teamData.js';

const query = async (sql, params) => {
  if (sql.includes('LIMIT')) {
    assert.doesNotMatch(sql, /\bu\.birth_date\b/);
    assert.match(sql, /to_jsonb\(u\)->>'birth_date'/);
    if (params.includes('active')) assert.match(sql, /(?:u|t)\.status = \$2/);
    return { rows: [{ id: 'child', first_name: 'Example', status: 'active', birth_date: null }] };
  }
  if (sql.includes('active_count')) return { rows: [{ active_count: '1', inactive_count: '0' }] };
  return { rows: [{ count: '1' }] };
};
mock.module(new URL('../src/config/database.js', import.meta.url).href, { namedExports: { query, transaction: () => { throw new Error('Read-only team query'); } } });
const { getTeam } = await import('../src/controllers/partner.controller.js');
const readTeam = queryParams => new Promise((resolve, reject) => getTeam({ user: { id: 'parent' }, query: queryParams }, { json: resolve }, reject));

test('recursive team list works without a users.birth_date column and returns real statistics', async () => {
  const result = await readTeam({});
  assert.equal(result.members.length, 1);
  assert.equal(result.stats.directPartners, 1);
  assert.equal(result.stats.totalTeam, 1);
  assert.equal(result.stats.activePartners, 1);
});
test('direct team list and status-filtered recursive list support the same schema', async () => {
  assert.equal((await readTeam({ level: 'direct' })).members.length, 1);
  assert.equal((await readTeam({ status: 'active' })).members.length, 1);
});
test('team loader includes every page and preserves server-wide totals', async () => {
  const pages = [];
  const result = await loadAllTeamMembers(async ({ page }) => {
    pages.push(page);
    return { data: { members: [{ id: page }], pagination: { totalPages: 3 }, stats: { totalTeam: 3 } } };
  });
  assert.deepEqual(result.members.map(member => member.id), [1, 2, 3]);
  assert.deepEqual(pages, [1, 2, 3]);
  assert.equal(result.stats.totalTeam, 3);
});
test('team loader reports failed requests instead of returning an empty team', async () => {
  await assert.rejects(loadAllTeamMembers(async () => { throw new Error('unavailable'); }), /unavailable/);
});
