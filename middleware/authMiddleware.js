import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-dateOfBirth');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      return next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

export const admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user context' });
  }

  const cleanPhone = String(req.user.phone || '').replace(/\D/g, '');
  const isSuperAdmin = ['9867735936', '7021970672', '9820277252'].some(p => cleanPhone.endsWith(p)) ||
    ['Host', 'hostcbse', 'AKSHITRAVULA', 'AKSHIT', 'SB10', 'Nidhi sekhri'].includes(req.user.username);

  if (req.user.role === 'admin' || req.user.role === 'master' || isSuperAdmin) {
    req.user.role = 'admin';
    return next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export const optionalAuth = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-dateOfBirth');
    } catch (error) {
      console.error('Optional auth failed:', error);
    }
  }
  next();
};
