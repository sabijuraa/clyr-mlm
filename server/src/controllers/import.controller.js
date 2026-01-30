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

// ============================================
// IMPORT PARTNERS
// ============================================

/**
 * Import partners from CSV
 * POST /api/import/partners
 * 
 * CSV Format:
 * email,first_name,last_name,phone,company,vat_id,street,zip,city,country,upline_email,rank_level
 */
export const importPartners = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Keine CSV-Datei hochgeladen', 400);
  }

  const csvContent = req.file.buffer.toString('utf-8');
  let records;

  try {
    const parsed = Papa.parse(csvContent, {
    records = parsed.data;
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim()
    });
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
      const rowNum = i + 2; // +2 for header row and 0-index

      try {
        // Validate required fields
        if (!row.email || !row.first_name || !row.last_name) {
          results.errors.push(`Zeile ${rowNum}: E-Mail, Vorname und Nachname erforderlich`);
          results.skipped++;
          continue;
        }

        // Check if partner exists
        const existingResult = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [row.email.toLowerCase()]
        );

        if (existingResult.rows.length > 0) {
          emailToId.set(row.email.toLowerCase(), existingResult.rows[0].id);
          results.errors.push(`Zeile ${rowNum}: Partner ${row.email} existiert bereits`);
          results.skipped++;
          continue;
        }

        // Generate referral code
        const referralCode = generateReferralCode(row.first_name, row.last_name);
        
        // Default password (should be changed on first login)
        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        // Get rank ID
        let rankId = 1;
        if (row.rank_level) {
          const rankResult = await client.query(
            'SELECT id FROM ranks WHERE level = $1',
            [parseInt(row.rank_level) || 1]
          );
          if (rankResult.rows.length > 0) {
            rankId = rankResult.rows[0].id;
          }
        }

        // Insert partner
        const insertResult = await client.query(`
          INSERT INTO users (
            id, email, password_hash, first_name, last_name, phone,
            company, vat_id, street, zip, city, country,
            role, status, referral_code, rank_id,
            email_verified, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            'partner', 'active', $13, $14, true, CURRENT_TIMESTAMP
          ) RETURNING id
        `, [
          uuidv4(),
          row.email.toLowerCase(),
          hashedPassword,
          row.first_name,
          row.last_name,
          row.phone || null,
          row.company || null,
          row.vat_id || null,
          row.street || null,
          row.zip || null,
          row.city || null,
          row.country || 'DE',
          referralCode,
          rankId
        ]);

        emailToId.set(row.email.toLowerCase(), insertResult.rows[0].id);
        results.imported++;

        // Store temp password in notes for admin
        await client.query(`
          INSERT INTO activity_log (user_id, action, details)
          VALUES ($1, 'import_created', $2)
        `, [insertResult.rows[0].id, JSON.stringify({ tempPassword, importedBy: req.user.id })]);

      } catch (e) {
        results.errors.push(`Zeile ${rowNum}: ${e.message}`);
        results.skipped++;
      }
    }

    // Second pass: Set upline relationships
    for (const row of records) {
      if (row.upline_email && row.email) {
        const partnerId = emailToId.get(row.email.toLowerCase());
        const uplineId = emailToId.get(row.upline_email.toLowerCase());

        if (partnerId && uplineId) {
          await client.query(
            'UPDATE users SET upline_id = $2 WHERE id = $1',
            [partnerId, uplineId]
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

// ============================================
// IMPORT CUSTOMERS
// ============================================

/**
 * Import customers from CSV
 * POST /api/import/customers
 * 
 * CSV Format:
 * email,first_name,last_name,phone,company,vat_id,street,zip,city,country
 */
export const importCustomers = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Keine CSV-Datei hochgeladen', 400);
  }

  const csvContent = req.file.buffer.toString('utf-8');
  let records;

  try {
    const parsed = Papa.parse(csvContent, {
    records = parsed.data;
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim()
    });
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
        const existingResult = await client.query(
          'SELECT id FROM customers WHERE email = $1',
          [row.email.toLowerCase()]
        );

        if (existingResult.rows.length > 0) {
          // Update existing customer
          await client.query(`
            UPDATE customers SET
              first_name = COALESCE(NULLIF($2, ''), first_name),
              last_name = COALESCE(NULLIF($3, ''), last_name),
              phone = COALESCE(NULLIF($4, ''), phone),
              company = COALESCE(NULLIF($5, ''), company),
              vat_id = COALESCE(NULLIF($6, ''), vat_id),
              street = COALESCE(NULLIF($7, ''), street),
              zip = COALESCE(NULLIF($8, ''), zip),
              city = COALESCE(NULLIF($9, ''), city),
              country = COALESCE(NULLIF($10, ''), country),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [
            existingResult.rows[0].id,
            row.first_name,
            row.last_name,
            row.phone,
            row.company,
            row.vat_id,
            row.street,
            row.zip,
            row.city,
            row.country
          ]);
          results.updated++;
        } else {
          // Insert new customer
          await client.query(`
            INSERT INTO customers (
              email, first_name, last_name, phone,
              company, vat_id, street, zip, city, country,
              is_registered, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, CURRENT_TIMESTAMP
            )
          `, [
            row.email.toLowerCase(),
            row.first_name || '',
            row.last_name || '',
            row.phone || null,
            row.company || null,
            row.vat_id || null,
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
    message: `Import abgeschlossen: ${results.imported} neu, ${results.updated} aktualisiert, ${results.skipped} übersprungen`,
    results
  });
});

// ============================================
// IMPORT DOWNLINES
// ============================================

/**
 * Import/Update downline structure
 * POST /api/import/downlines
 * 
 * CSV Format:
 * partner_email,upline_email
 */
export const importDownlines = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Keine CSV-Datei hochgeladen', 400);
  }

  const csvContent = req.file.buffer.toString('utf-8');
  let records;

  try {
    const parsed = Papa.parse(csvContent, {
    records = parsed.data;
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim()
    });
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

        // Get partner ID
        const partnerResult = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [row.partner_email.toLowerCase()]
        );

        if (partnerResult.rows.length === 0) {
          results.errors.push(`Zeile ${rowNum}: Partner ${row.partner_email} nicht gefunden`);
          results.skipped++;
          continue;
        }

        // Get upline ID
        const uplineResult = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [row.upline_email.toLowerCase()]
        );

        if (uplineResult.rows.length === 0) {
          results.errors.push(`Zeile ${rowNum}: Upline ${row.upline_email} nicht gefunden`);
          results.skipped++;
          continue;
        }

        // Prevent circular references
        const partnerId = partnerResult.rows[0].id;
        const uplineId = uplineResult.rows[0].id;

        if (partnerId === uplineId) {
          results.errors.push(`Zeile ${rowNum}: Partner kann nicht eigener Upline sein`);
          results.skipped++;
          continue;
        }

        // Check for circular reference (upline chain shouldn't contain partner)
        let currentUpline = uplineId;
        let depth = 0;
        let isCircular = false;

        while (currentUpline && depth < 50) {
          const uplineCheck = await client.query(
            'SELECT upline_id FROM users WHERE id = $1',
            [currentUpline]
          );
          
          if (uplineCheck.rows.length === 0 || !uplineCheck.rows[0].upline_id) {
            break;
          }

          if (uplineCheck.rows[0].upline_id === partnerId) {
            isCircular = true;
            break;
          }

          currentUpline = uplineCheck.rows[0].upline_id;
          depth++;
        }

        if (isCircular) {
          results.errors.push(`Zeile ${rowNum}: Zirkuläre Referenz erkannt`);
          results.skipped++;
          continue;
        }

        // Update upline
        await client.query(
          'UPDATE users SET upline_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [partnerId, uplineId]
        );

        // Update upline's direct partner count
        await client.query(`
          UPDATE users SET direct_partners_count = (
            SELECT COUNT(*) FROM users WHERE upline_id = $1 AND status = 'active'
          ) WHERE id = $1
        `, [uplineId]);

        results.updated++;
      } catch (e) {
        results.errors.push(`Zeile ${rowNum}: ${e.message}`);
        results.skipped++;
      }
    }
  });

  res.json({
    success: true,
    message: `Import abgeschlossen: ${results.updated} aktualisiert, ${results.skipped} übersprungen`,
    results
  });
});

// ============================================
// EXPORT TEMPLATES
// ============================================

/**
 * Download CSV template for partners
 * GET /api/import/templates/partners
 */
export const getPartnersTemplate = asyncHandler(async (req, res) => {
  const csv = 'email,first_name,last_name,phone,company,vat_id,street,zip,city,country,upline_email,rank_level\n' +
    'max.mustermann@example.com,Max,Mustermann,+49123456789,Mustermann GmbH,DE123456789,Musterstr. 1,12345,Berlin,DE,sponsor@example.com,1\n' +
    'maria.muster@example.com,Maria,Muster,+49987654321,,,Testweg 2,54321,München,DE,max.mustermann@example.com,1';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="partner-import-template.csv"');
  res.send(csv);
});

/**
 * Download CSV template for customers
 * GET /api/import/templates/customers
 */
export const getCustomersTemplate = asyncHandler(async (req, res) => {
  const csv = 'email,first_name,last_name,phone,company,vat_id,street,zip,city,country\n' +
    'kunde@example.com,Hans,Kunde,+49123456789,Firma GmbH,DE123456789,Kundenstr. 1,12345,Hamburg,DE';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="customer-import-template.csv"');
  res.send(csv);
});

/**
 * Download CSV template for downlines
 * GET /api/import/templates/downlines
 */
export const getDownlinesTemplate = asyncHandler(async (req, res) => {
  const csv = 'partner_email,upline_email\n' +
    'partner@example.com,sponsor@example.com';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="downline-import-template.csv"');
  res.send(csv);
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateReferralCode(firstName, lastName) {
  const prefix = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
}

function generateTempPassword() {
  return 'CLYR-' + Math.random().toString(36).substring(2, 10);
}
