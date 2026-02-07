import { validationResult, body, param, query as queryValidator } from 'express-validator';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg
    }));

    return res.status(400).json({
      error: 'Validierungsfehler',
      details: formattedErrors
    });
  }

  next();
};

/**
 * Common validation rules
 */
export const validationRules = {
  // Auth
  login: [
    body('email')
      .isEmail().withMessage('Ungültige E-Mail-Adresse')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Passwort erforderlich')
  ],

  register: [
    body('email')
      .isEmail().withMessage('Ungültige E-Mail-Adresse')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen haben')
      .matches(/[A-Z]/).withMessage('Passwort muss einen Großbuchstaben enthalten')
      .matches(/[a-z]/).withMessage('Passwort muss einen Kleinbuchstaben enthalten')
      .matches(/[0-9]/).withMessage('Passwort muss eine Zahl enthalten'),
    body('firstName')
      .trim()
      .notEmpty().withMessage('Vorname erforderlich')
      .isLength({ max: 100 }).withMessage('Vorname zu lang'),
    body('lastName')
      .trim()
      .notEmpty().withMessage('Nachname erforderlich')
      .isLength({ max: 100 }).withMessage('Nachname zu lang'),
    body('phone')
      .optional()
      .trim()
      .matches(/^[\d\s\+\-\(\)]+$/).withMessage('Ungültige Telefonnummer'),
    body('referralCode')
      .optional()
      .trim()
      .isLength({ min: 3, max: 20 }).withMessage('Ungültiger Empfehlungscode'),
    body('street')
      .trim()
      .notEmpty().withMessage('Straße erforderlich'),
    body('zip')
      .trim()
      .notEmpty().withMessage('PLZ erforderlich'),
    body('city')
      .trim()
      .notEmpty().withMessage('Stadt erforderlich'),
    body('country')
      .isIn(['DE', 'AT', 'CH']).withMessage('Land muss DE, AT oder CH sein'),
    body('iban')
      .optional()
      .trim()
      .matches(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,}$/).withMessage('Ungültige IBAN'),
    body('termsAccepted')
      .equals('true').withMessage('AGB müssen akzeptiert werden')
  ],

  // Orders
  createOrder: [
    body('customer.email')
      .isEmail().withMessage('Ungültige E-Mail-Adresse'),
    body('customer.firstName')
      .trim()
      .notEmpty().withMessage('Vorname erforderlich'),
    body('customer.lastName')
      .trim()
      .notEmpty().withMessage('Nachname erforderlich'),
    body('billing.street')
      .trim()
      .notEmpty().withMessage('Straße erforderlich'),
    body('billing.zip')
      .trim()
      .notEmpty().withMessage('PLZ erforderlich'),
    body('billing.city')
      .trim()
      .notEmpty().withMessage('Stadt erforderlich'),
    body('billing.country')
      .isIn(['DE', 'AT', 'CH']).withMessage('Land muss DE, AT oder CH sein'),
    body('items')
      .isArray({ min: 1 }).withMessage('Mindestens ein Artikel erforderlich'),
    body('items.*.productId')
      .isInt({ min: 1 }).withMessage('Ungültige Produkt-ID'),
    body('items.*.quantity')
      .isInt({ min: 1, max: 99 }).withMessage('Ungültige Menge')
  ],

  // Products
  createProduct: [
    body('name')
      .trim()
      .notEmpty().withMessage('Produktname erforderlich')
      .isLength({ max: 255 }).withMessage('Name zu lang'),
    body('price')
      .isFloat({ min: 0.01 }).withMessage('Preis muss positiv sein'),
    body('categoryId')
      .optional()
      .isInt({ min: 1 }).withMessage('Ungültige Kategorie'),
    body('stock')
      .optional()
      .isInt({ min: 0 }).withMessage('Bestand muss positiv sein')
  ],

  updateProduct: [
    param('id')
      .isInt({ min: 1 }).withMessage('Ungültige Produkt-ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 }).withMessage('Ungültiger Name'),
    body('price')
      .optional()
      .isFloat({ min: 0.01 }).withMessage('Preis muss positiv sein'),
    body('stock')
      .optional()
      .isInt({ min: 0 }).withMessage('Bestand muss positiv sein')
  ],

  // Pagination
  pagination: [
    queryValidator('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Seite muss positiv sein'),
    queryValidator('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit muss zwischen 1 und 100 sein')
  ],

  // UUID param
  uuidParam: [
    param('id')
      .isUUID().withMessage('Ungültige ID')
  ],

  // Int param
  intParam: [
    param('id')
      .isInt({ min: 1 }).withMessage('Ungültige ID')
  ]
};