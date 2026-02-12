// server/src/controllers/faq.controller.js
// GROUP 8 #38: FAQ page
import { query } from '../config/database.js';

// Public: Get active FAQ items
export const getFaqItems = async (req, res) => {
  try {
    const { category } = req.query;
    let sql = `SELECT id, question, answer, question_en, answer_en, category, sort_order
               FROM faq_items WHERE is_active = true`;
    const params = [];
    if (category) {
      sql += ` AND category = $1`;
      params.push(category);
    }
    sql += ` ORDER BY sort_order, id`;
    const result = await query(sql, params);
    res.json({ items: result.rows });
  } catch (error) {
    console.error('Get FAQ error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der FAQ' });
  }
};

// Admin: Get all FAQ items (including inactive)
export const getAllFaqItems = async (req, res) => {
  try {
    const result = await query('SELECT * FROM faq_items ORDER BY sort_order, id');
    res.json({ items: result.rows });
  } catch (error) {
    console.error('Get all FAQ error:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
};

// Admin: Create FAQ item
export const createFaqItem = async (req, res) => {
  try {
    const { question, answer, question_en, answer_en, category, sort_order } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'Frage und Antwort erforderlich' });

    const result = await query(`
      INSERT INTO faq_items (question, answer, question_en, answer_en, category, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [question, answer, question_en || '', answer_en || '', category || 'allgemein', sort_order || 0]);
    res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    console.error('Create FAQ error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
};

// Admin: Update FAQ item
export const updateFaqItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, question_en, answer_en, category, sort_order, is_active } = req.body;

    const result = await query(`
      UPDATE faq_items SET
        question = COALESCE($1, question), answer = COALESCE($2, answer),
        question_en = COALESCE($3, question_en), answer_en = COALESCE($4, answer_en),
        category = COALESCE($5, category), sort_order = COALESCE($6, sort_order),
        is_active = COALESCE($7, is_active), updated_at = NOW()
      WHERE id = $8 RETURNING *
    `, [question, answer, question_en, answer_en, category, sort_order, is_active, id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'FAQ nicht gefunden' });
    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Update FAQ error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
};

// Admin: Delete FAQ item
export const deleteFaqItem = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM faq_items WHERE id = $1', [id]);
    res.json({ message: 'FAQ geloescht' });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({ error: 'Fehler beim Loeschen' });
  }
};
