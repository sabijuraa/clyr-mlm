const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const docsDir = path.join(__dirname, '../../documents');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

// List available documents (for customers / partners / public)
router.get('/', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    let where = "WHERE visibility = 'public'";
    if (role === 'partner' || role === 'admin') where += " OR visibility = 'partner'";
    if (role === 'admin') where += " OR visibility = 'admin'";
    const result = await db.query(`SELECT * FROM documents ${where} ORDER BY category, sort_order`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Download document
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const doc = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!doc.rows[0]) return res.status(404).json({ error: 'Dokument nicht gefunden' });
    const d = doc.rows[0];
    if (d.visibility === 'partner' && req.user.role === 'customer') return res.status(403).json({ error: 'Nicht berechtigt' });
    if (d.visibility === 'admin' && req.user.role !== 'admin') return res.status(403).json({ error: 'Nicht berechtigt' });
    
    const filePath = path.join(docsDir, d.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei nicht gefunden' });
    res.download(filePath, d.original_name || d.title);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: upload document
router.post('/', authenticate, requireRole('admin'), upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, visibility } = req.body;
    const file = req.file;
    if (!file || !title) return res.status(400).json({ error: 'Titel und Datei erforderlich' });
    
    // Move to documents dir
    const destPath = `${Date.now()}-${file.originalname}`;
    fs.renameSync(file.path, path.join(docsDir, destPath));

    const result = await db.query(`
      INSERT INTO documents (title, description, category, visibility, file_path, original_name, file_size, mime_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description || '', category || 'Allgemein', visibility || 'public', destPath,
       file.originalname, file.size, file.mimetype]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: delete document
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const doc = await db.query('SELECT file_path FROM documents WHERE id = $1', [req.params.id]);
    if (doc.rows[0]) {
      const filePath = path.join(docsDir, doc.rows[0].file_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Gelöscht' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
