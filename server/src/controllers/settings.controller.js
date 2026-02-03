// server/src/controllers/settings.controller.js
import pool from '../config/database.js';

// ===== LEGAL DOCUMENTS =====

export const getAllLegalDocuments = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM legal_documents ORDER BY document_type');
    res.json(result.rows);
  } catch (error) {
    console.error('Get legal documents error:', error);
    res.status(500).json({ error: 'Failed to fetch legal documents' });
  }
};

export const getLegalDocument = async (req, res) => {
  try {
    const { type } = req.params;
    const result = await pool.query('SELECT * FROM legal_documents WHERE document_type = $1', [type]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get legal document error:', error);
    res.status(500).json({ error: 'Failed to fetch legal document' });
  }
};

export const updateLegalDocument = async (req, res) => {
  try {
    const { type } = req.params;
    const { title, content } = req.body;
    const userId = req.user?.id || null;

    const result = await pool.query(`
      UPDATE legal_documents
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          version = version + 1,
          last_updated = NOW(),
          updated_by = $3
      WHERE document_type = $4
      RETURNING *
    `, [title, content, userId, type]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update legal document error:', error);
    res.status(500).json({ error: 'Failed to update legal document' });
  }
};

// ===== COMPANY SETTINGS =====

export const getCompanySettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM company_settings WHERE id = 1');
    
    if (result.rows.length === 0) {
      const insertResult = await pool.query(`
        INSERT INTO company_settings (id, company_name, email) VALUES (1, 'CLYR', 'info@clyr.de') RETURNING *
      `);
      return res.json(insertResult.rows[0]);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get company settings error:', error);
    res.status(500).json({ error: 'Failed to fetch company settings' });
  }
};

export const updateCompanySettings = async (req, res) => {
  try {
    const { company_name, company_legal_name, tax_id, registration_number, address_line1, address_line2, city, postal_code, country, phone, email, support_email, bank_name, iban, bic } = req.body;

    const result = await pool.query(`
      UPDATE company_settings
      SET company_name = COALESCE($1, company_name),
          company_legal_name = COALESCE($2, company_legal_name),
          tax_id = COALESCE($3, tax_id),
          registration_number = COALESCE($4, registration_number),
          address_line1 = COALESCE($5, address_line1),
          address_line2 = $6,
          city = COALESCE($7, city),
          postal_code = COALESCE($8, postal_code),
          country = COALESCE($9, country),
          phone = COALESCE($10, phone),
          email = COALESCE($11, email),
          support_email = COALESCE($12, support_email),
          bank_name = COALESCE($13, bank_name),
          iban = COALESCE($14, iban),
          bic = COALESCE($15, bic),
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [company_name, company_legal_name, tax_id, registration_number, address_line1, address_line2, city, postal_code, country, phone, email, support_email, bank_name, iban, bic]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({ error: 'Failed to update company settings' });
  }
};

// ===== SHIPPING RULES =====

export const getShippingRules = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shipping_rules WHERE is_active = true ORDER BY country');
    res.json(result.rows);
  } catch (error) {
    console.error('Get shipping rules error:', error);
    res.status(500).json({ error: 'Failed to fetch shipping rules' });
  }
};

export const updateShippingRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { shipping_cost, free_shipping_threshold, estimated_days } = req.body;

    const result = await pool.query(`
      UPDATE shipping_rules
      SET shipping_cost = COALESCE($1, shipping_cost),
          free_shipping_threshold = $2,
          estimated_days = COALESCE($3, estimated_days)
      WHERE id = $4
      RETURNING *
    `, [shipping_cost, free_shipping_threshold, estimated_days, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipping rule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update shipping rule error:', error);
    res.status(500).json({ error: 'Failed to update shipping rule' });
  }
};