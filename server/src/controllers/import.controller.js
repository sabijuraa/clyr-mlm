/**
 * Import Controller
 * =================
 * Handles bulk import of:
 * - Partners/Affiliates
 * - Customers
 * - Downline structures
 * - Products
 */

import { query, transaction } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import multer from 'multer';
import Papa from 'papaparse';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for file uploads
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new AppError('Nur CSV-Dateien erlaubt', 400), false);
    }
  }
});

/**
 * Parse CSV content using PapaParse
 */
const parseCSV = (csvContent) => {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  });
  
  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }
  
  return result.data;
};

/**
 * Import Partners/Affiliates from CSV
 * Expected columns: email, first_name, last_name, phone, upline_email (optional)
 */
export const importPartners = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Keine CSV-Datei hochgeladen', 400);
  }

  const csvContent = req.file.buffer.toString('utf-8');
  let records;

  try {
    records = parseCSV(csvContent);
  } catch (e) {
    throw new AppError('CSV-Parsing fehlgeschlagen: ' + e.message, 400);
  }

  if (records.length === 0) {
    throw new AppError('CSV-Datei ist leer', 400);
  }

  const results = {
    total: records.length,
    imported: 0,
    skipped: 0,
    errors: []
  };

  // First pass: Create all partners without upline
  const emailToId = new Map();

  await transaction(async (client) => {
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2;

      try {
        if (!row.email || !row.first_name || !row.last_name) {
          results.errors.push(`Zeile ${rowNum}: email, first_name, last_name erforderlich`);
          results.skipped++;
          continue;
        }

        // Check if partner already exists
        const existing = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [row.email.toLowerCase()]
        );

        if (existing.rows.length > 0) {
          emailToId.set(row.email.toLowerCase(), existing.rows[0].id);
          results.skipped++;
          continue;
        }

        // Generate referral code
        const referralCode = uuidv4().substring(0, 8).toUpperCase();
        const hashedPassword = await bcrypt.hash('Welcome123!', 10);

        // Insert partner
        const result = await client.query(`
          INSERT INTO users (
            email, password, first_name, last_name, phone,
            referral_code, role, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'partner', 'active')
          RETURNING id
        `, [
          row.email.toLowerCase(),
          hashedPassword,
          row.first_name,
          row.last_name,
          row.phone || null,
          referralCode
        ]);

        emailToId.set(row.email.toLowerCase(), result.rows[0].id);
        results.imported++;
      } catch (e) {
        results.errors.push(`Zeile ${rowNum}: ${e.message}`);
        results.skipped++;
      }
    }

    // Second pass: Set uplines
    for (const row of records) {
      if (row.upline_email) {
        const partnerId = emailToId.get(row.email.toLowerCase());
        const uplineId = emailToId.get(row.upline_email.toLowerCase());

        if (partnerId && uplineId) {
          await client.query(
            'UPDATE users SET upline_id = $1 WHERE id = $2',
            [uplineId, partnerId]
          );
        }
      }
    }
  });

  res.json({
    success: true,
    message: `Import abgeschlossen: ${results.imported} importiert, ${results.skipped} übersprungen`,
    results
  });
});

/**
 * Import Customers from CSV
 * Expected columns: email, first_name, last_name, phone, street, zip, city, country
 */
export const importCustomers = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Keine CSV-Datei hochgeladen', 400);
  }

  const csvContent = req.file.buffer.toString('utf-8');
  let records;

  try {
    records = parseCSV(csvContent);
  } catch (e) {
    throw new AppError('CSV-Parsing fehlgeschlagen: ' + e.message, 400);
  }

  const results = {
    total: records.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  await transaction(async (client) => {
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2;

      try {
        if (!row.email) {
          results.errors.push(`Zeile ${rowNum}: E-Mail erforderlich`);
          results.skipped++;
          continue;
        }

        // Check if customer exists
        const existing = await client.query(
          'SELECT id FROM customers WHERE email = $1',
          [row.email.toLowerCase()]
        );

        if (existing.rows.length > 0) {
          // Update existing customer
          await client.query(`
            UPDATE customers SET
              first_name = COALESCE($1, first_name),
              last_name = COALESCE($2, last_name),
              phone = COALESCE($3, phone),
              street = COALESCE($4, street),
              zip = COALESCE($5, zip),
              city = COALESCE($6, city),
              country = COALESCE($7, country),
              updated_at = NOW()
            WHERE id = $8
          `, [
            row.first_name || null,
            row.last_name || null,
            row.phone || null,
            row.street || null,
            row.zip || null,
            row.city || null,
            row.country || 'DE',
            existing.rows[0].id
          ]);
          results.updated++;
        } else {
          // Insert new customer
          await client.query(`
            INSERT INTO customers (
              email, first_name, last_name, phone,
              street, zip, city, country
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            row.email.toLowerCase(),
            row.first_name || '',
            row.last_name || '',
            row.phone || null,
            row.street || null,
            row.zip || null,
            row.city || null,
            row.country || 'DE'
          ]);
          results.imported++;
        }
      } catch (e) {
        results.errors.push(`Zeile ${rowNum}: ${e.message}`);
        results.skipped++;
      }
    }
  });

  res.json({
    success: true,
    message: `Import abgeschlossen: ${results.imported} neu, ${results.updated} aktualisiert`,
    results
  });
});

/**
 * Import Products from CSV
 * Expected columns: sku, name, description, price, category, stock
 */
export const importProducts = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Keine CSV-Datei hochgeladen', 400);
  }

  const csvContent = req.file.buffer.toString('utf-8');
  let records;

  try {
    records = parseCSV(csvContent);
  } catch (e) {
    throw new AppError('CSV-Parsing fehlgeschlagen: ' + e.message, 400);
  }

  const results = {
    total: records.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  await transaction(async (client) => {
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2;

      try {
        if (!row.sku || !row.name || !row.price) {
          results.errors.push(`Zeile ${rowNum}: sku, name, price erforderlich`);
          results.skipped++;
          continue;
        }

        const price = parseFloat(row.price);
        if (isNaN(price)) {
          results.errors.push(`Zeile ${rowNum}: Ungültiger Preis`);
          results.skipped++;
          continue;
        }

        // Check if product exists
        const existing = await client.query(
          'SELECT id FROM products WHERE sku = $1',
          [row.sku]
        );

        if (existing.rows.length > 0) {
          // Update existing
          await client.query(`
            UPDATE products SET
              name = $1,
              description = COALESCE($2, description),
              price = $3,
              category = COALESCE($4, category),
              stock = COALESCE($5, stock),
              updated_at = NOW()
            WHERE id = $6
          `, [
            row.name,
            row.description || null,
            price,
            row.category || 'general',
            row.stock ? parseInt(row.stock) : null,
            existing.rows[0].id
          ]);
          results.updated++;
        } else {
          // Create slug
          const slug = row.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          await client.query(`
            INSERT INTO products (
              sku, name, slug, description, price, 
              category, stock, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
          `, [
            row.sku,
            row.name,
            slug + '-' + Date.now(),
            row.description || '',
            price,
            row.category || 'general',
            row.stock ? parseInt(row.stock) : 0
          ]);
          results.imported++;
        }
      } catch (e) {
        results.errors.push(`Zeile ${rowNum}: ${e.message}`);
        results.skipped++;
      }
    }
  });

  res.json({
    success: true,
    message: `Import abgeschlossen: ${results.imported} neu, ${results.updated} aktualisiert`,
    results
  });
});

/**
 * Import Downline Structure from CSV
 * Expected columns: partner_email, upline_email
 */
export const importDownlines = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Keine CSV-Datei hochgeladen', 400);
  }

  const csvContent = req.file.buffer.toString('utf-8');
  let records;

  try {
    records = parseCSV(csvContent);
  } catch (e) {
    throw new AppError('CSV-Parsing fehlgeschlagen: ' + e.message, 400);
  }

  const results = {
    total: records.length,
    updated: 0,
    skipped: 0,
    errors: []
  };

  await transaction(async (client) => {
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2;

      try {
        if (!row.partner_email || !row.upline_email) {
          results.errors.push(`Zeile ${rowNum}: partner_email und upline_email erforderlich`);
          results.skipped++;
          continue;
        }

        // Find partner
        const partner = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [row.partner_email.toLowerCase()]
        );

        if (partner.rows.length === 0) {
          results.errors.push(`Zeile ${rowNum}: Partner nicht gefunden: ${row.partner_email}`);
          results.skipped++;
          continue;
        }

        // Find upline
        const upline = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [row.upline_email.toLowerCase()]
        );

        if (upline.rows.length === 0) {
          results.errors.push(`Zeile ${rowNum}: Upline nicht gefunden: ${row.upline_email}`);
          results.skipped++;
          continue;
        }

        // Update partner's upline
        await client.query(
          'UPDATE users SET upline_id = $1 WHERE id = $2',
          [upline.rows[0].id, partner.rows[0].id]
        );
        results.updated++;
      } catch (e) {
        results.errors.push(`Zeile ${rowNum}: ${e.message}`);
        results.skipped++;
      }
    }
  });

  res.json({
    success: true,
    message: `Import abgeschlossen: ${results.updated} Strukturen aktualisiert`,
    results
  });
});

/**
 * Download CSV Template
 */
export const downloadTemplate = asyncHandler(async (req, res) => {
  const { type } = req.params;

  const templates = {
    partners: 'email,first_name,last_name,phone,upline_email\njohn@example.com,John,Doe,+49123456789,sponsor@example.com',
    customers: 'email,first_name,last_name,phone,street,zip,city,country\ncustomer@example.com,Max,Mustermann,+49123456789,Musterstraße 1,12345,Berlin,DE',
    products: 'sku,name,description,price,category,stock\nPROD-001,Produktname,Beschreibung,99.99,wasserfilter,100',
    downlines: 'partner_email,upline_email\nnew-partner@example.com,sponsor@example.com'
  };

  if (!templates[type]) {
    throw new AppError('Ungültiger Template-Typ', 400);
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-template.csv"`);
  res.send(templates[type]);
});

export default {
  upload,
  importPartners,
  importCustomers,
  importProducts,
  importDownlines,
  downloadTemplate
};
