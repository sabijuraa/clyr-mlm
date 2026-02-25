import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, transaction } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { sendPasswordReset, sendPartnerWelcome } from '../services/email.service.js';

/**
 * Generate access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

/**
 * Generate unique referral code
 */
const generateReferralCode = async (firstName, lastName) => {
  const base = (firstName.substring(0, 3) + lastName.substring(0, 3)).toUpperCase();
  let code = base + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    const result = await query('SELECT id FROM users WHERE referral_code = $1', [code]);
    if (result.rows.length === 0) {
      exists = false;
    } else {
      code = base + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      attempts++;
    }
  }
  
  return code;
};

/**
 * Calculate prorated annual fee based on month
 */
const calculateProratedFee = () => {
  const currentMonth = new Date().getMonth() + 1;
  const fullFee = 100;
  const monthlyRate = fullFee / 12;
  const remainingMonths = 13 - currentMonth;
  return Math.round(remainingMonths * monthlyRate * 100) / 100;
};

/**
 * Generate password reset token
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash reset token for storage
 */
const hashResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await query(
    `SELECT u.*, r.name as rank_name, r.commission_rate, r.color as rank_color
     FROM users u
     LEFT JOIN ranks r ON u.rank_id = r.id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new AppError('E-Mail oder Passwort falsch', 401, 'Anmeldefehler');
  }

  const user = result.rows[0];

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('E-Mail oder Passwort falsch', 401, 'Anmeldefehler');
  }

  if (user.status === 'suspended') {
    throw new AppError('Ihr Konto wurde gesperrt', 403, 'Konto gesperrt');
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, expiresAt]
  );

  await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

  delete user.password_hash;

  res.json({
    message: 'Erfolgreich angemeldet',
    user,
    accessToken,
    refreshToken
  });
});

/**
 * Register new partner
 */
export const register = asyncHandler(async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phone,
    referralCode,
    company,
    vatId,
    street,
    zip,
    city,
    country,
    iban,
    bic
  } = req.body;

  // #40: T&C acceptance required
  const termsAccepted = req.body.termsAccepted === 'true' || req.body.termsAccepted === true;
  if (!termsAccepted) {
    throw new AppError('VP-Vertrag und AGB muessen akzeptiert werden.', 400);
  }

  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existingUser.rows.length > 0) {
    throw new AppError('E-Mail-Adresse bereits registriert', 409, 'Registrierungsfehler');
  }

  // #53: Crossline sponsoring prohibition - check if email was previously registered under a different sponsor
  const previousPartner = await query(
    `SELECT id, upline_id, status FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  // Note: The check above already returned empty rows (user doesn't exist), so crossline
  // is handled by preventing sponsor changes on existing accounts.
  // For re-registration attempts, we block above with "already registered" error.

  // Territory restriction: only DE/AT/CH partners allowed (#49)
  const allowedCountries = ['DE', 'AT', 'CH'];
  if (country && !allowedCountries.includes(country)) {
    throw new AppError('Registrierung ist nur fuer Partner aus Deutschland, Oesterreich und der Schweiz moeglich.', 400);
  }

  // DE affiliates must have VAT UID (#28)
  if (country === 'DE' && !vatId) {
    throw new AppError('Deutsche Partner benoetigen eine gueltige USt-IdNr.', 400);
  }

  let uplineId = null;
  if (referralCode) {
    const uplineResult = await query('SELECT id FROM users WHERE referral_code = $1', [referralCode.toUpperCase()]);
    if (uplineResult.rows.length > 0) {
      uplineId = uplineResult.rows[0].id;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newReferralCode = await generateReferralCode(firstName, lastName);
  // Look up starter rank by slug (not hardcoded id)
  const starterRankResult = await query("SELECT id FROM ranks WHERE slug = 'starter'");
  const beraterRankResult = await query("SELECT id FROM ranks WHERE slug = 'berater'");
  const starterRankId = starterRankResult.rows[0]?.id || 1;
  const beraterRankId = beraterRankResult.rows[0]?.id || 2;
  const startingRank = req.body.hasOwnMachine ? beraterRankId : starterRankId;
  const proratedFee = calculateProratedFee();

  const passportUrl = req.files?.passport?.[0]?.filename ? `/uploads/documents/${req.files.passport[0].filename}` : (req.uploadedDocuments?.passport || null);
  const bankCardUrl = req.files?.bankCard?.[0]?.filename ? `/uploads/documents/${req.files.bankCard[0].filename}` : (req.uploadedDocuments?.bankCard || null);
  const tradeLicenseUrl = req.files?.tradeLicense?.[0]?.filename ? `/uploads/documents/${req.files.tradeLicense[0].filename}` : (req.uploadedDocuments?.tradeLicense || null);

  const result = await transaction(async (client) => {
    const userResult = await client.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, phone,
        role, status, referral_code, upline_id, rank_id,
        company, vat_id, street, zip, city, country,
        iban, bic, passport_url, bank_card_url, trade_license_url,
        has_own_machine, terms_accepted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING id, email, first_name, last_name, referral_code, status`,
      [
        email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone,
        'partner',
        'pending',
        newReferralCode,
        uplineId,
        startingRank,
        company,
        vatId,
        street,
        zip,
        city,
        country,
        iban,
        bic,
        passportUrl,
        bankCardUrl,
        tradeLicenseUrl,
        req.body.hasOwnMachine || false,
        termsAccepted ? new Date() : null
      ]
    );

    if (uplineId) {
      await client.query(
        'UPDATE users SET direct_partners_count = direct_partners_count + 1 WHERE id = $1',
        [uplineId]
      );
    }

    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userResult.rows[0].id, 'partner_registered', 'user', userResult.rows[0].id, JSON.stringify({ referralCode, uplineId })]
    );

    return userResult.rows[0];
  });

  // Send welcome email (non-blocking)
  sendPartnerWelcome({ 
    email: result.email, 
    first_name: result.first_name, 
    referral_code: result.referral_code 
  }).catch(err => console.error('Welcome email failed:', err));

  res.status(201).json({
    message: 'Registrierung erfolgreich',
    user: result,
    proratedFee,
    nextStep: 'Bitte bezahlen Sie die Jahresgebühr, um Ihr Konto zu aktivieren'
  });
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh Token erforderlich', 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new AppError('Ungültiger Refresh Token', 401);
  }

  const tokenResult = await query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > CURRENT_TIMESTAMP',
    [refreshToken, decoded.userId]
  );

  if (tokenResult.rows.length === 0) {
    throw new AppError('Refresh Token ungültig oder abgelaufen', 401);
  }

  const accessToken = generateAccessToken(decoded.userId);

  res.json({ accessToken });
});

/**
 * Get current user
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT u.*, r.name as rank_name, r.commission_rate, r.color as rank_color,
            r.level as rank_level, r.min_own_sales, r.min_team_sales
     FROM users u
     LEFT JOIN ranks r ON u.rank_id = r.id
     WHERE u.id = $1`,
    [req.user.id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Benutzer nicht gefunden', 404);
  }

  const user = result.rows[0];
  delete user.password_hash;

  const nextRankResult = await query(
    'SELECT * FROM ranks WHERE level = $1',
    [user.rank_level + 1]
  );

  const nextRank = nextRankResult.rows[0] || null;

  res.json({
    user,
    nextRank
  });
});

/**
 * Logout
 */
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  }

  res.json({ message: 'Erfolgreich abgemeldet' });
});

/**
 * Update profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    phone,
    company,
    vatId,
    street,
    zip,
    city,
    country,
    iban,
    bic,
    bankName,
    bank_name,
    referralCode
  } = req.body;

  // Handle referral code change
  if (referralCode) {
    const cleanCode = referralCode.toUpperCase().replace(/[^A-Z0-9\-_]/g, '');
    if (cleanCode.length < 3 || cleanCode.length > 20) {
      throw new AppError('Code muss 3-20 Zeichen haben', 400);
    }
    // Check if it's already the user's own code (no change needed)
    const currentUser = await query('SELECT referral_code FROM users WHERE id = $1', [req.user.id]);
    if (currentUser.rows[0]?.referral_code !== cleanCode) {
      // Check uniqueness against other users
      const existing = await query('SELECT id FROM users WHERE UPPER(referral_code) = $1 AND id != $2', [cleanCode, req.user.id]);
      if (existing.rows.length > 0) {
        throw new AppError('Dieser Code ist bereits vergeben', 409);
      }
      await query('UPDATE users SET referral_code = $1 WHERE id = $2', [cleanCode, req.user.id]);
    }
  }

  // Helper: treat empty strings as null for COALESCE
  const nullIfEmpty = (v) => (v === '' || v === undefined) ? null : v;
  const effectiveBankName = bankName || bank_name;

  const result = await query(
    `UPDATE users SET
      first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name),
      phone = COALESCE($3, phone),
      company = COALESCE($4, company),
      vat_id = COALESCE($5, vat_id),
      street = COALESCE($6, street),
      zip = COALESCE($7, zip),
      city = COALESCE($8, city),
      country = COALESCE($9, country),
      iban = COALESCE($10, iban),
      bic = COALESCE($11, bic),
      bank_name = COALESCE($12, bank_name),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $13
     RETURNING *`,
    [nullIfEmpty(firstName), nullIfEmpty(lastName), nullIfEmpty(phone), nullIfEmpty(company), nullIfEmpty(vatId), nullIfEmpty(street), nullIfEmpty(zip), nullIfEmpty(city), nullIfEmpty(country), nullIfEmpty(iban), nullIfEmpty(bic), nullIfEmpty(effectiveBankName), req.user.id]
  );

  const user = result.rows[0];
  delete user.password_hash;

  res.json({
    message: 'Profil aktualisiert',
    user
  });
});

/**
 * Change password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    throw new AppError('Aktuelles Passwort falsch', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

  res.json({ message: 'Passwort erfolgreich geändert' });
});

/**
 * Check if referral code exists
 */
export const checkReferralCode = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const result = await query(
    'SELECT first_name, last_name FROM users WHERE referral_code = $1 AND status = $2',
    [code.toUpperCase(), 'active']
  );

  if (result.rows.length === 0) {
    return res.json({ valid: false });
  }

  const user = result.rows[0];
  res.json({
    valid: true,
    partnerName: `${user.first_name} ${user.last_name.charAt(0)}.`
  });
});

/**
 * Forgot password - send reset email
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await query(
    'SELECT id, email, first_name FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  
  // Always return success to prevent email enumeration
  if (result.rows.length === 0) {
    return res.json({ message: 'Wenn die E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet' });
  }

  const user = result.rows[0];

  // Generate reset token
  const resetToken = generateResetToken();
  const hashedToken = hashResetToken(resetToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store hashed token in database
  await query(
    `UPDATE users SET 
      password_reset_token = $1, 
      password_reset_expires = $2 
     WHERE id = $3`,
    [hashedToken, expiresAt, user.id]
  );

  // Send email with plain token
  try {
    await sendPasswordReset(user, resetToken);
  } catch (emailError) {
    console.error('Failed to send password reset email:', emailError);
  }

  res.json({ message: 'Wenn die E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet' });
});

/**
 * Reset password with token
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new AppError('Token und neues Passwort erforderlich', 400);
  }

  const hashedToken = hashResetToken(token);

  const result = await query(
    `SELECT id, email FROM users 
     WHERE password_reset_token = $1 
     AND password_reset_expires > CURRENT_TIMESTAMP`,
    [hashedToken]
  );

  if (result.rows.length === 0) {
    throw new AppError('Token ungültig oder abgelaufen', 400);
  }

  const user = result.rows[0];
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await query(
    `UPDATE users SET 
      password_hash = $1,
      password_reset_token = NULL,
      password_reset_expires = NULL
     WHERE id = $2`,
    [passwordHash, user.id]
  );

  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);

  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id)
     VALUES ($1, $2, $3, $4)`,
    [user.id, 'password_reset', 'user', user.id]
  );

  res.json({ message: 'Passwort wurde erfolgreich zurückgesetzt' });
});

/**
 * Check if admin setup is available (no admin exists yet)
 */
export const checkSetup = asyncHandler(async (req, res) => {
  const result = await query(
    "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
  );
  
  const adminCount = parseInt(result.rows[0].count);
  
  res.json({
    setupAvailable: adminCount === 0
  });
});

/**
 * Setup first admin account
 */
export const setupAdmin = asyncHandler(async (req, res) => {
  const { setupKey, firstName, lastName, email, password } = req.body;

  // Verify setup key from environment
  const validSetupKey = process.env.ADMIN_SETUP_KEY;
  
  if (!validSetupKey) {
    throw new AppError('Admin-Setup ist nicht konfiguriert. Bitte ADMIN_SETUP_KEY in .env setzen.', 500);
  }

  if (setupKey !== validSetupKey) {
    throw new AppError('Ungültiger Setup-Schlüssel', 401);
  }

  // Check if admin already exists
  const existingAdmin = await query(
    "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
  );
  
  if (parseInt(existingAdmin.rows[0].count) > 0) {
    throw new AppError('Ein Admin-Konto existiert bereits', 400);
  }

  // Check if email is already in use
  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  
  if (existingUser.rows.length > 0) {
    throw new AppError('Diese E-Mail-Adresse ist bereits registriert', 409);
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(password, 12);
  const referralCode = await generateReferralCode(firstName, lastName);

  // Get highest rank for admin
  const rankResult = await query(
    'SELECT id FROM ranks ORDER BY level DESC LIMIT 1'
  );
  const highestRankId = rankResult.rows[0]?.id || 1;

  const result = await query(
    `INSERT INTO users (
      email, password_hash, first_name, last_name,
      role, status, referral_code, rank_id, country
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, email, first_name, last_name, role, referral_code`,
    [
      email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      'admin',
      'active',
      referralCode,
      highestRankId,
      'DE'
    ]
  );

  const admin = result.rows[0];

  // Log the activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [admin.id, 'admin_created', 'user', admin.id, JSON.stringify({ method: 'setup_page' })]
  );

  res.status(201).json({
    message: 'Admin-Konto erfolgreich erstellt',
    admin: {
      id: admin.id,
      email: admin.email,
      firstName: admin.first_name,
      lastName: admin.last_name
    }
  });
});
