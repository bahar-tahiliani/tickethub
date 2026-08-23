const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the Bearer token and attaches { id, role, email, name } to req.user.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, 'Unauthorized: no token provided');
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, role, email, name }
    next();
  } catch (err) {
    throw new ApiError(401, 'Unauthorized: invalid or expired token');
  }
});

// Role-based authorization guard, e.g. authorize('admin'), authorize('organiser', 'admin')
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    throw new ApiError(403, 'Forbidden: you do not have permission to perform this action');
  }
  next();
};

module.exports = { authenticate, authorize };
