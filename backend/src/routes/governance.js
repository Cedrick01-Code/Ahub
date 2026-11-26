import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { VeterinaryCase, AuditEvent } from '../models/Governance.js';

const router = express.Router();
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const staffRoles = ['sector', 'district', 'province', 'rab'];
const officerRoles = ['sector', 'district', 'province', 'rab'];

const authenticate = asyncRoute(async (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return res.status(503).json({ message: 'Authentication is not configured.' });
  const [scheme, token] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'A valid active session is required.' });
  try {
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active' || Number(user.tokenVersion || 0) !== Number(payload.tokenVersion || 0)) {
      return res.status(401).json({ message: 'A valid active session is required.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'A valid active session is required.' });
  }
});

const audit = (req, action, resourceType, resourceId = '', metadata = {}) =>
  AuditEvent.create({
    actorId: req.user._id,
    actorPortal: req.user.portal,
    action,
    resourceType,
    resourceId: String(resourceId || ''),
    ipAddress: req.ip,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
    metadata,
  });

const regionFilter = user => {
  if (user.portal === 'rab') return {};
  if (user.portal === 'province') return { province: user.province };
  if (user.portal === 'district') return { province: user.province, district: user.district };
  if (user.portal === 'sector') return { province: user.province, district: user.district, sector: user.sector };
  return null;
};
const canAccessCase = (user, record) => {
  if (user.portal === 'farmer') return String(record.farmerId) === String(user._id);
  if (officerRoles.includes(user.portal)) {
    const filter = regionFilter(user);
    return !!filter && Object.entries(filter).every(([key, value]) => String(record[key]) === String(value));
  }
  return false;
};
const safeId = id => mongoose.isValidObjectId(id);

router.post('/veterinary/cases', authenticate, asyncRoute(async (req, res) => {
  if (req.user.portal !== 'farmer') return res.status(403).json({ message: 'Only farmers can open a veterinary case.' });
  const { title, description, category, severity, productionUnitId, requestedVisitAt, attachments } = req.body || {};
  if (!String(title || '').trim() || !String(description || '').trim()) return res.status(400).json({ message: 'Title and description are required.' });
  if (!req.user.province || !req.user.district || !req.user.sector) return res.status(400).json({ message: 'Your account must have a complete province, district and sector before submitting a case.' });
  if (productionUnitId && !safeId(productionUnitId)) return res.status(400).json({ message: 'Invalid production unit.' });
  const record = await VeterinaryCase.create({
    farmerId: req.user._id,
    productionUnitId: productionUnitId || null,
    title: String(title).trim(),
    description: String(description).trim(),
    category,
    severity,
    requestedVisitAt: requestedVisitAt || undefined,
    attachments: Array.isArray(attachments) ? attachments.filter(x => typeof x === 'string').slice(0, 8) : [],
    province: req.user.province,
    district: req.user.district,
    sector: req.user.sector,
    history: [{ action: 'created', note: 'Case submitted by farmer', actorId: req.user._id }],
  });
  await audit(req, 'veterinary_case.created', 'VeterinaryCase', record._id);
  res.status(201).json({ data: record });
}));

router.get('/veterinary/cases', authenticate, asyncRoute(async (req, res) => {
  let filter;
  if (req.user.portal === 'farmer') filter = { farmerId: req.user._id };
  else if (officerRoles.includes(req.user.portal)) filter = regionFilter(req.user);
  else return res.status(403).json({ message: 'This portal cannot access veterinary cases.' });
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const [cases, total] = await Promise.all([
    VeterinaryCase.find(filter).populate('farmerId', 'fullName phone sector district province').populate('assignedOfficerId', 'fullName portal').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    VeterinaryCase.countDocuments(filter),
  ]);
  res.json({ data: cases, total, page, limit, totalPages: Math.ceil(total / limit) });
}));

router.get('/veterinary/cases/:id', authenticate, asyncRoute(async (req, res) => {
  if (!safeId(req.params.id)) return res.status(404).json({ message: 'Case not found.' });
  const record = await VeterinaryCase.findById(req.params.id).populate('farmerId', 'fullName phone sector district province').populate('assignedOfficerId', 'fullName portal').lean();
  if (!record || !canAccessCase(req.user, record)) return res.status(404).json({ message: 'Case not found.' });
  res.json({ data: record });
}));

router.patch('/veterinary/cases/:id', authenticate, asyncRoute(async (req, res) => {
  if (!officerRoles.includes(req.user.portal)) return res.status(403).json({ message: 'Only veterinary officers can update case workflow.' });
  if (!safeId(req.params.id)) return res.status(404).json({ message: 'Case not found.' });
  const record = await VeterinaryCase.findById(req.params.id);
  if (!record || !canAccessCase(req.user, record)) return res.status(404).json({ message: 'Case not found.' });
  const { status, diagnosis, treatment, resolution, scheduledVisitAt, assignedOfficerId, note } = req.body || {};
  const allowed = ['assigned', 'scheduled', 'in_progress', 'escalated', 'resolved', 'closed'];
  if (status && !allowed.includes(status)) return res.status(400).json({ message: 'Unsupported case status transition.' });
  if (assignedOfficerId) {
    if (!safeId(assignedOfficerId)) return res.status(400).json({ message: 'Invalid officer account.' });
    const officer = await User.findOne({ _id: assignedOfficerId, portal: { $in: staffRoles }, status: 'active', province: record.province, district: record.district, ...(req.user.portal === 'sector' ? { sector: record.sector } : {}) });
    if (!officer) return res.status(400).json({ message: 'The selected officer is not active in this case region.' });
    record.assignedOfficerId = officer._id;
  }
  if (status) record.status = status;
  if (diagnosis !== undefined) record.diagnosis = String(diagnosis).slice(0, 5000);
  if (treatment !== undefined) record.treatment = String(treatment).slice(0, 5000);
  if (resolution !== undefined) record.resolution = String(resolution).slice(0, 5000);
  if (scheduledVisitAt !== undefined) record.scheduledVisitAt = scheduledVisitAt || null;
  if (status === 'resolved') record.resolvedAt = new Date();
  if (status === 'closed') record.closedAt = new Date();
  record.history.push({ action: status || (assignedOfficerId ? 'assigned' : 'updated'), note: String(note || '').slice(0, 1000), actorId: req.user._id });
  await record.save();
  await audit(req, 'veterinary_case.updated', 'VeterinaryCase', record._id, { status: record.status });
  res.json({ data: record });
}));

router.get('/audit-events', authenticate, asyncRoute(async (req, res) => {
  if (req.user.portal !== 'nsg') return res.status(403).json({ message: 'Only NSG administrators can view audit events.' });
  const filter = {};
  if (req.query.actorId && safeId(req.query.actorId)) filter.actorId = req.query.actorId;
  if (req.query.action) filter.action = String(req.query.action).slice(0, 100);
  if (req.query.outcome) filter.outcome = req.query.outcome;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const [events, total] = await Promise.all([
    AuditEvent.find(filter).populate('actorId', 'fullName email portal').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditEvent.countDocuments(filter),
  ]);
  res.json({ data: events, total, page, limit, totalPages: Math.ceil(total / limit) });
}));

export default router;
