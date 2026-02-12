/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Stripe errors
  if (err.type === 'StripeCardError') {
    return res.status(400).json({
      error: 'Zahlungsfehler',
      message: err.message
    });
  }

  if (err.type === 'StripeInvalidRequestError') {
    return res.status(400).json({
      error: 'Ungültige Zahlungsanfrage',
      message: 'Bitte überprüfen Sie Ihre Zahlungsdaten'
    });
  }

  // Database errors
  if (err.code === '23505') {
    // Unique constraint violation
    return res.status(409).json({
      error: 'Doppelter Eintrag',
      message: 'Ein Eintrag mit diesen Daten existiert bereits'
    });
  }

  if (err.code === '23503') {
    // Foreign key violation
    return res.status(400).json({
      error: 'Referenzfehler',
      message: 'Verweis auf nicht existierenden Datensatz'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentifizierungsfehler',
      message: 'Ungültiger Token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Session abgelaufen',
      message: 'Bitte erneut anmelden'
    });
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'Datei zu groß',
      message: 'Die Datei überschreitet die maximale Größe von 5MB'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unerwartete Datei',
      message: 'Zu viele Dateien oder falsches Feld'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validierungsfehler',
      message: err.message,
      details: err.details
    });
  }

  // Custom application errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.error || 'Fehler',
      message: err.message
    });
  }

  // Default server error
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(500).json({
    error: 'Server-Fehler',
    message: isProduction ? 'Ein unerwarteter Fehler ist aufgetreten' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
};

/**
 * Not found handler
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Nicht gefunden',
    message: `Route ${req.method} ${req.originalUrl} nicht gefunden`
  });
};

/**
 * Async handler wrapper to catch errors
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, error = 'Fehler') {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    Error.captureStackTrace(this, this.constructor);
  }
}