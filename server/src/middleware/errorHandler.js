const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Ein Fehler ist aufgetreten' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};
module.exports = errorHandler;
