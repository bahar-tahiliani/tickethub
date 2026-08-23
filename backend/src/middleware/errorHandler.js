// Central error handler - every thrown ApiError (or unexpected error) lands
// here and gets turned into a consistent { message } JSON response.
function errorHandler(err, req, res, next) {
  const statusCode = err.isApiError ? err.statusCode : 500;
  const message = err.isApiError ? err.message : 'Something went wrong. Please try again.';

  if (!err.isApiError) {
    // Unexpected errors are worth logging in full for debugging.
    console.error('[unhandled error]', err);
  }

  res.status(statusCode).json({ success: false, message });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
}

module.exports = { errorHandler, notFoundHandler };
