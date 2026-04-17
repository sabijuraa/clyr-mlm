// server/src/controllers/settings.controller.js
import pool from '../config/database.js';

const ensureCompanySettingsColumns = async () => {
  const cols = [
    'website VARCHAR(255)',
    'vat_id VARCHAR(50)',
    'court VARCHAR(100)',
    'managing_director VARCHAR(255)',
    'commercial_register VARCHAR(100)',
    'state VARCHAR(100)',
    'account_holder VARCHAR(255)'
  ];
  for (const col of cols) {
    try {
      await pool.query(`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS ${col}`);
    } catch (error) {
      console.error('Ensure company_settings column failed:', col, error.message);
    }
  }
};

const getCompanySettingsColumns = async () => {
  const result = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'company_settings'`
  );
  return new Set(result.rows.map((r) => r.column_name));
};

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
    await ensureCompanySettingsColumns();
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
    await ensureCompanySettingsColumns();
    const availableCols = await getCompanySettingsColumns();
    const {
      company_name,
      company_legal_name,
      tax_id,
      vat_id,
      registration_number,
      commercial_register,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      phone,
      email,
      support_email,
      website,
      bank_name,
      account_holder,
      iban,
      bic,
      court,
      managing_director
    } = req.body;

    const normalizeCountry = (value) => {
      if (!value) return 'AT';
      const raw = String(value).trim();
      const upper = raw.toUpperCase();
      if (['AT', 'DE', 'CH'].includes(upper)) return upper;
      if (upper.includes('AUSTRIA') || upper.includes('OESTERREICH') || upper.includes('ÖSTERREICH')) return 'AT';
      if (upper.includes('GERMANY') || upper.includes('DEUTSCHLAND')) return 'DE';
      if (upper.includes('SWITZERLAND') || upper.includes('SCHWEIZ')) return 'CH';
      return upper.slice(0, 2);
    };

    const safeCompanyName = (company_name && String(company_name).trim()) || 'CLYR';
    const safeCountry = normalizeCountry(country);

    // Build schema-safe upsert based on columns that actually exist in DB.
    const inputByColumn = {
      company_name: safeCompanyName,
      company_legal_name,
      tax_id,
      vat_id,
      registration_number,
      commercial_register,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country: safeCountry,
      phone,
      email,
      support_email,
      website,
      bank_name,
      account_holder,
      iban,
      bic,
      court,
      managing_director
    };
    const presentEntries = Object.entries(inputByColumn).filter(
      ([col, val]) => availableCols.has(col) && val !== undefined
    );
    const presentColumns = presentEntries.map(([col]) => col);
    const values = presentEntries.map(([, val]) => val);

    let result;
    if (presentColumns.length === 0) {
      result = await pool.query(`
        INSERT INTO company_settings (id) VALUES (1)
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
        RETURNING *
      `);
    } else {
      const insertCols = ['id', ...presentColumns, 'updated_at'];
      const insertVals = ['1', ...presentColumns.map((_, i) => `$${i + 1}`), 'NOW()'];
      const updateSet = [
        ...presentColumns.map((col) => `${col} = COALESCE(EXCLUDED.${col}, company_settings.${col})`),
        'updated_at = NOW()'
      ];
      result = await pool.query(`
        INSERT INTO company_settings (${insertCols.join(', ')})
        VALUES (${insertVals.join(', ')})
        ON CONFLICT (id) DO UPDATE SET ${updateSet.join(', ')}
        RETURNING *
      `, values);
    }

    const fresh = await pool.query('SELECT * FROM company_settings WHERE id = 1');
    res.json(fresh.rows[0] || result.rows[0]);
  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({ error: 'Failed to update company settings', detail: error.message });
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

// ===== RETURN POLICY =====

export const getReturnPolicy = async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'return_policy'");
    if (result.rows.length === 0) {
      return res.json({
        days: 14,
        condition: 'unbenutzt und originalverpackt',
        process: 'Bitte kontaktieren Sie uns per E-Mail fuer eine Ruecksendegenehmigung.',
        exclusions: [],
        contact_email: 'service@clyr.shop'
      });
    }
    res.json(result.rows[0].value);
  } catch (error) {
    console.error('Get return policy error:', error);
    res.status(500).json({ error: 'Failed to fetch return policy' });
  }
};

export const updateReturnPolicy = async (req, res) => {
  try {
    const { days, condition, process, exclusions, contact_email } = req.body;
    const value = JSON.stringify({ days, condition, process, exclusions, contact_email });

    const result = await pool.query(`
      INSERT INTO settings (key, value, description)
      VALUES ('return_policy', $1, 'Return policy configuration')
      ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
      RETURNING *
    `, [value]);

    res.json(result.rows[0].value);
  } catch (error) {
    console.error('Update return policy error:', error);
    res.status(500).json({ error: 'Failed to update return policy' });
  }
};

// ===== SHIPPING COSTS SETTINGS =====

export const getShippingCosts = async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'shipping_costs'");
    if (result.rows.length === 0) {
      // CLYR default shipping costs (per business rules)
      return res.json({
        AT: { large: 55, small: 9.90 },
        DE: { large: 70, small: 14.90 },
        CH: { large: 180, small: 35 }
      });
    }
    // settings.value is JSONB - return the parsed object directly
    const val = result.rows[0].value;
    if (typeof val === 'string') {
      try { return res.json(JSON.parse(val)); } catch { return res.json(val); }
    }
    res.json(val);
  } catch (error) {
    console.error('Get shipping costs error:', error);
    res.status(500).json({ error: 'Failed to fetch shipping costs' });
  }
};

export const updateShippingCosts = async (req, res) => {
  try {
    const value = JSON.stringify(req.body);
    const result = await pool.query(`
      INSERT INTO settings (key, value, description)
      VALUES ('shipping_costs', $1, 'Shipping costs per country')
      ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
      RETURNING *
    `, [value]);
    res.json(result.rows[0].value);
  } catch (error) {
    console.error('Update shipping costs error:', error);
    res.status(500).json({ error: 'Failed to update shipping costs' });
  }
};

// ===== VAT RATES SETTINGS =====

export const getVatRates = async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'vat_rates'");
    if (result.rows.length === 0) {
      return res.json({ DE: 19, AT: 20, CH: 8.1 });
    }
    res.json(result.rows[0].value);
  } catch (error) {
    console.error('Get VAT rates error:', error);
    res.status(500).json({ error: 'Failed to fetch VAT rates' });
  }
};

export const updateVatRates = async (req, res) => {
  try {
    const value = JSON.stringify(req.body);
    const result = await pool.query(`
      INSERT INTO settings (key, value, description)
      VALUES ('vat_rates', $1, 'VAT rates per country (%). DE: 19% B2C / 0% B2B. AT: 20%. CH: 8.1%.')
      ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
      RETURNING *
    `, [value]);
    res.json(result.rows[0].value);
  } catch (error) {
    console.error('Update VAT rates error:', error);
    res.status(500).json({ error: 'Failed to update VAT rates' });
  }
};
