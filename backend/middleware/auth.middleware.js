const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
      hotelId: decoded.hotelId || null
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

function requireAdminOrHotelAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'hotel-admin')) {
    return res.status(403).json({ message: 'Admin or hotel-admin access required' });
  }
  next();
}

module.exports = {
  verifyToken,
  requireAdmin,
  requireAdminOrHotelAdmin
};

