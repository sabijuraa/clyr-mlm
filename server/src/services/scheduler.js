const db = require('../config/database');

// Run rank decay check daily
function startScheduledJobs() {
  // Check rank decay every 24 hours
  setInterval(async () => {
    try {
      await checkRankDecay();
    } catch (err) {
      console.error('Rank decay check failed:', err.message);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours

  // Run once on startup (delayed 30s to let DB connect)
  setTimeout(async () => {
    try {
      await checkRankDecay();
      console.log('✓ Initial rank decay check completed');
    } catch (err) {
      console.error('Initial rank decay check failed:', err.message);
    }
  }, 30000);

  console.log('✓ Scheduled jobs started');
}

// 12-month rank decay: Partners who haven't sold in 12 months reset to R2
async function checkRankDecay() {
  const result = await db.query(`
    SELECT p.id, p.user_id, p.rank_id, p.rank_achieved_at, p.last_sale_at, u.first_name, u.last_name
    FROM partners p JOIN users u ON p.user_id = u.id
    WHERE p.rank_id > 2 AND p.rank_id < 7 
    AND (p.last_sale_at IS NULL OR p.last_sale_at < NOW() - INTERVAL '12 months')
    AND p.rank_achieved_at < NOW() - INTERVAL '12 months'
  `);

  for (const partner of result.rows) {
    await db.query('UPDATE partners SET rank_id = 2, rank_achieved_at = NOW() WHERE id = $1', [partner.id]);
    await db.query(
      'INSERT INTO rank_history (partner_id, old_rank_id, new_rank_id, reason) VALUES ($1, $2, 2, $3)',
      [partner.id, partner.rank_id, '12-Monats Rang-Reset wegen Inaktivität']
    );
    console.log(`Rank decay: ${partner.first_name} ${partner.last_name} R${partner.rank_id} → R2`);
  }

  if (result.rows.length > 0) {
    console.log(`Rank decay: ${result.rows.length} partners reset to R2`);
  }
}

module.exports = { startScheduledJobs, checkRankDecay };
