import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const unauthorized = (res) => res.status(401).json({ message: 'A valid active session is required.' });

const authenticateRequest = async (req, res, next) => {
  const [scheme, token] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return unauthorized(res);

  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Authentication is temporarily unavailable.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return unauthorized(res);
  }

  const user = await User.findById(payload.sub);
  if (
    !user ||
    user.status !== 'active' ||
    Number(user.tokenVersion || 0) !== Number(payload.tokenVersion || 0)
  ) {
    return unauthorized(res);
  }

  req.user = user;
  req.authUser = user;
  return next();
};

export const authenticate = (req, res, next) =>
  Promise.resolve(authenticateRequest(req, res, next)).catch(next);

export const allowPortals = (...allowedPortals) => (req, res, next) => {
  if (!req.user || !allowedPortals.includes(req.user.portal)) {
    return res.status(403).json({ message: 'This portal cannot perform that action.' });
  }
  return next();
};
