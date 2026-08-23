// Lightweight, predictable error type so controllers/services can throw
// with an explicit HTTP status and a user-friendly message, and the central
// error handler can format them consistently.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isApiError = true;
  }
}

module.exports = ApiError;
