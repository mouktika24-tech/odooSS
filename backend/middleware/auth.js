const jwt = require('jsonwebtoken');

const JTW_SECRET = process.env.JWT_SECRET || 'stocksense-dev-secret';

const sendUnauthorized = (res, message) => {
  return res.status(401).json({
    success: false,
    message,
    errors: [],
  });
};

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      return sendUnauthorized(
        res,
        'Authentication token is missing. Please log in again.'
      );
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
      return sendUnauthorized(
        res,
        'Authentication token is invalid. Please log in again.'
      );
    }

    const decoded = jwt.verify(parts[1], JTW_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    console.error('JWT verification error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return sendUnauthorized(
        res,
        'Your session has expired. Please log in again.'
      );
    }

    return sendUnauthorized(
      res,
      'Invalid authentication token. Please log in again.'
    );
  }
};

module.exports = {
  authMiddleware,
};
