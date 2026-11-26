import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { ProductionUnit } from '../models/ProductionUnit.js';
import { Notification } from '../models/Operations.js';
import {
  AuditEvent,
  Conversation,
  ConversationMessage,
  DemandRequest,
  OfficialPrice,
  VetVisitRequest,
  VeterinaryCase,
} from '../models/Workflow.js';
import { authenticate, allowPortals } from '../middleware/auth.js';
import { canAccessRegion, buildRegionFilter } from '../utils/regionAccess.js';

const router = express.Router();
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const data = (res, value, status = 200) => res.status(status).json({ data: value });
const notFound = res => res.status(404).json({ message: 'Not found.' });
const validId = value => mongoose.isValidObjectId(value);
const officerPortals = ['sector', 'district', 'province', 'rab'];
const isOfficer = user => officerPortals.includes(user?.portal);
const sameId = (a, b) => String(a) === String(b);
const notifyUser = (userId, title, body, entityType, entityId) =>
  Notification.create({ userId, title, body, entityType, entityId });
const notifyRegionalFarmers = async (region, title, body, entityType, entityId) => {
  const recipients = await User.find({
    portal: 'farmer', status: 'active',
    province: region.province, district: region.district, sector: region.sector,
  }).distinct('_id');
  if (recipients.length) await Notification.insertMany(recipients.map(userId => ({ userId, title, body, entityType, entityId })));
};
const notifyRegionalVets = async (region, title, body, entityType, entityId) => {
  const recipients = await User.find({
    portal: 'sector', status: 'active',
    province: region.province, district: region.district, sector: region.sector,
  }).distinct('_id');
  if (recipients.length) await Notification.insertMany(recipients.map(userId => ({ userId, title, body, entityType, entityId })));
};

const audit = (req, action, targetType, targetId, metadata = {}) =>
  AuditEvent.create({
    actorId: req.user?._id || null,
    actorPortal: req.user?.portal || '',
    action,
    targetType,
    targetId: targetId || null,
    region: {
      province: req.user?.province || '',
      district: req.user?.district || '',
      sector: req.user?.sector || '',
    },
    metadata,
    ipAddress: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').slice(0, 120),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
  });

const caseVisibleTo = (user, item) =>
  (user.portal === 'farmer' && sameId(item.farmerId, user._id)) ||
  (isOfficer(user) && canAccessRegion(user, item.location));

const getCase = async id => {
  if (!validId(id)) return null;
  return VeterinaryCase.findById(id);
};

router.use(authenticate);

// -----------------------------------------------------------------------------
// MARKETPLACE: customer demand is separate from a confirmed order.
// -----------------------------------------------------------------------------
router.post('/market/demand', allowPortals('customer'), asyncRoute(async (req, res) => {
  const { productName, category = 'other', quantity, unit, budgetPerUnit, requiredBy, location, notes = '' } = req.body || {};
  const region = {
    province: String(location?.province || req.user.province || '').trim(),
    district: String(location?.district || req.user.district || '').trim(),
    sector: String(location?.sector || req.user.sector || '').trim(),
    cell: String(location?.cell || '').trim(),
    village: String(location?.village || '').trim(),
  };
  if (!productName?.trim() || !unit?.trim() || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
    return res.status(400).json({ message: 'Product, a positive quantity and unit are required.' });
  }
  if (!region.province || !region.district || !region.sector) {
    return res.status(400).json({ message: 'Select the delivery province, district and sector.' });
  }
  const request = await DemandRequest.create({
    customerId: req.user._id,
    productName: productName.trim(),
    category,
    quantity: Number(quantity),
    unit: unit.trim(),
    ...(budgetPerUnit !== undefined && budgetPerUnit !== '' ? { budgetPerUnit: Number(budgetPerUnit) } : {}),
    ...(requiredBy ? { requiredBy: new Date(requiredBy) } : {}),
    location: region,
    notes: String(notes).trim(),
  });
  await Promise.all([
    audit(req, 'market.demand.created', 'DemandRequest', request._id, { productName: request.productName }),
    notifyRegionalFarmers(region, 'New customer demand', `${request.quantity} ${request.unit} of ${request.productName} requested in your sector.`, 'demand', request._id),
  ]);
  data(res, request, 201);
}));

router.get('/market/demand', allowPortals('customer', 'farmer', 'sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const { status = 'open', page = 1, limit = 20 } = req.query;
  const filter = {};
  if (req.user.portal === 'customer') filter.customerId = req.user._id;
  else if (req.user.portal === 'farmer') {
    filter['location.sector'] = req.user.sector;
    filter['location.district'] = req.user.district;
    filter['location.province'] = req.user.province;
  } else Object.assign(filter, buildRegionFilter(req.user, 'location'));
  if (status !== 'all') filter.status = status;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const [items, total] = await Promise.all([
    DemandRequest.find(filter).populate('customerId', 'fullName customerType').sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    DemandRequest.countDocuments(filter),
  ]);
  data(res, { items, total, page: safePage, pages: Math.ceil(total / safeLimit) });
}));

router.post('/market/demand/:id/interest', allowPortals('farmer'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return notFound(res);
  const request = await DemandRequest.findOne({
    _id: req.params.id,
    status: 'open',
    'location.province': req.user.province,
    'location.district': req.user.district,
    'location.sector': req.user.sector,
  });
  if (!request) return notFound(res);
  request.interestedFarmerIds.addToSet(req.user._id);
  await request.save();
  await audit(req, 'market.demand.interest', 'DemandRequest', request._id);
  data(res, { interested: true, demandRequestId: request._id });
}));

router.patch('/market/demand/:id/status', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return notFound(res);
  const request = await DemandRequest.findById(req.params.id);
  if (!request) return notFound(res);
  const nextStatus = req.body?.status;
  if (req.user.portal === 'customer') {
    if (!sameId(request.customerId, req.user._id) || !['cancelled', 'fulfilled'].includes(nextStatus)) return res.status(403).json({ message: 'Customers can only cancel or close their own requests.' });
  } else if (req.user.portal === 'farmer') {
    if (!request.interestedFarmerIds.some(id => sameId(id, req.user._id)) || !['contacted'].includes(nextStatus)) return res.status(403).json({ message: 'Register interest before updating this request.' });
  } else return res.status(403).json({ message: 'This portal cannot update customer demand.' });
  request.status = nextStatus;
  await request.save();
  await audit(req, 'market.demand.status_changed', 'DemandRequest', request._id, { status: nextStatus });
  data(res, request);
}));

// -----------------------------------------------------------------------------
// DIRECT MESSAGING: conversations are independent from order conversations.
// -----------------------------------------------------------------------------
router.get('/conversations', asyncRoute(async (req, res) => {
  const items = await Conversation.find({ participants: req.user._id })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'fullName portal')
    .lean();
  data(res, items);
}));

router.post('/conversations', asyncRoute(async (req, res) => {
  const { recipientId, subject = 'AHub conversation', contextType = 'general', contextId = null, firstMessage = '' } = req.body || {};
  if (!validId(recipientId) || sameId(recipientId, req.user._id)) return res.status(400).json({ message: 'Choose a valid recipient.' });
  if (!['general', 'product', 'order', 'demand', 'veterinary'].includes(contextType)) return res.status(400).json({ message: 'Invalid conversation context.' });
  const recipient = await User.findOne({ _id: recipientId, status: 'active' }).select('_id portal');
  if (!recipient || recipient.portal === 'nsg') return res.status(404).json({ message: 'Recipient is unavailable.' });
  const query = { participants: { $all: [req.user._id, recipient._id], $size: 2 }, contextType, contextId: validId(contextId) ? contextId : null };
  let conversation = await Conversation.findOne(query);
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, recipient._id],
      subject: String(subject).trim().slice(0, 160) || 'AHub conversation',
      contextType,
      contextId: validId(contextId) ? contextId : null,
    });
  }
  if (String(firstMessage).trim()) {
    const message = await ConversationMessage.create({ conversationId: conversation._id, senderId: req.user._id, body: String(firstMessage).trim() });
    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessagePreview = message.body.slice(0, 180);
    await conversation.save();
  }
  await Promise.all([
    audit(req, 'messaging.conversation.opened', 'Conversation', conversation._id, { contextType }),
    ...(String(firstMessage).trim() ? [notifyUser(recipient._id, 'New AHub message', `${req.user.fullName} sent you a message.`, 'conversation', conversation._id)] : []),
  ]);
  data(res, await Conversation.findById(conversation._id).populate('participants', 'fullName portal'), 201);
}));

router.get('/conversations/:id/messages', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return notFound(res);
  const conversation = await Conversation.findOne({ _id: req.params.id, participants: req.user._id });
  if (!conversation) return notFound(res);
  await ConversationMessage.updateMany(
    { conversationId: conversation._id, senderId: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } },
  );
  const messages = await ConversationMessage.find({ conversationId: conversation._id })
    .populate('senderId', 'fullName portal')
    .sort({ createdAt: 1 })
    .limit(500)
    .lean();
  data(res, messages);
}));

router.post('/conversations/:id/messages', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return notFound(res);
  const body = String(req.body?.body || '').trim();
  if (!body || body.length > 5000) return res.status(400).json({ message: 'Message must contain between 1 and 5,000 characters.' });
  const conversation = await Conversation.findOne({ _id: req.params.id, participants: req.user._id });
  if (!conversation) return notFound(res);
  const message = await ConversationMessage.create({ conversationId: conversation._id, senderId: req.user._id, body, readBy: [req.user._id] });
  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = body.slice(0, 180);
  await conversation.save();
  const recipientIds = conversation.participants.filter(id => !sameId(id, req.user._id));
  if (recipientIds.length) await Promise.all(recipientIds.map(id => notifyUser(id, 'New AHub message', `${req.user.fullName} sent you a message.`, 'conversation', conversation._id)));
  data(res, await message.populate('senderId', 'fullName portal'), 201);
}));

// -----------------------------------------------------------------------------
// VETERINARY CASES and visit requests.
// -----------------------------------------------------------------------------
router.post('/veterinary/cases', allowPortals('farmer'), asyncRoute(async (req, res) => {
  const { productionUnitId, category, issueTitle, description, urgency = 'normal' } = req.body || {};
  if (!issueTitle?.trim() || !description?.trim()) return res.status(400).json({ message: 'Issue title and description are required.' });
  let location = { province: req.user.province, district: req.user.district, sector: req.user.sector, cell: '', village: req.user.village || '' };
  if (productionUnitId) {
    if (!validId(productionUnitId)) return res.status(400).json({ message: 'Invalid production unit.' });
    const unit = await ProductionUnit.findOne({ _id: productionUnitId, farmerId: req.user._id });
    if (!unit) return notFound(res);
    location = { ...unit.location.toObject(), province: unit.location.province, district: unit.location.district, sector: unit.location.sector };
  }
  if (!location.province || !location.district || !location.sector) return res.status(400).json({ message: 'Your account must have a complete region before reporting a problem.' });
  const item = await VeterinaryCase.create({
    farmerId: req.user._id,
    productionUnitId: productionUnitId || null,
    location,
    category: ['livestock', 'crop', 'general'].includes(category) ? category : 'general',
    issueTitle: issueTitle.trim(),
    description: description.trim(),
    urgency: ['low', 'normal', 'high', 'emergency'].includes(urgency) ? urgency : 'normal',
  });
  await Promise.all([
    audit(req, 'veterinary.case.created', 'VeterinaryCase', item._id, { urgency: item.urgency }),
    notifyRegionalVets(location, 'New veterinary case', `${item.issueTitle} (${item.urgency})`, 'veterinary_case', item._id),
  ]);
  data(res, item, 201);
}));

router.get('/veterinary/cases', allowPortals('farmer', 'sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const filter = req.user.portal === 'farmer'
    ? { farmerId: req.user._id }
    : buildRegionFilter(req.user, 'location');
  if (req.query.status) filter.status = req.query.status;
  if (req.query.urgency) filter.urgency = req.query.urgency;
  const items = await VeterinaryCase.find(filter).populate('farmerId', 'fullName phone').populate('assignedOfficerId', 'fullName portal').sort({ urgency: -1, createdAt: -1 }).limit(200).lean();
  data(res, items);
}));

router.get('/veterinary/cases/:id', allowPortals('farmer', 'sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const item = await getCase(req.params.id);
  if (!item || !caseVisibleTo(req.user, item)) return notFound(res);
  data(res, await item.populate([{ path: 'farmerId', select: 'fullName phone' }, { path: 'assignedOfficerId', select: 'fullName portal' }]));
}));

router.patch('/veterinary/cases/:id', allowPortals('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const item = await getCase(req.params.id);
  if (!item || !canAccessRegion(req.user, item.location)) return notFound(res);
  const { status, assignedOfficerId, resolution } = req.body || {};
  const allowedStatuses = ['open', 'assigned', 'visit_requested', 'in_progress', 'resolved', 'closed'];
  if (status && !allowedStatuses.includes(status)) return res.status(400).json({ message: 'Invalid case status.' });
  if (assignedOfficerId) {
    if (!validId(assignedOfficerId)) return res.status(400).json({ message: 'Invalid officer.' });
    const officer = await User.findOne({ _id: assignedOfficerId, portal: { $in: ['sector', 'district', 'province'] }, status: 'active' });
    if (!officer || !canAccessRegion(req.user, officer)) return res.status(403).json({ message: 'Officer is outside your assigned region.' });
    item.assignedOfficerId = officer._id;
    item.status = 'assigned';
  }
  if (status) item.status = status;
  if (resolution !== undefined) item.resolution = String(resolution).trim().slice(0, 3000);
  if (item.status === 'resolved') item.resolvedAt = new Date();
  await item.save();
  await Promise.all([
    audit(req, 'veterinary.case.updated', 'VeterinaryCase', item._id, { status: item.status, assignedOfficerId: item.assignedOfficerId }),
    notifyUser(item.farmerId, 'Veterinary case updated', `Your case “${item.issueTitle}” is now ${item.status}.`, 'veterinary_case', item._id),
  ]);
  data(res, item);
}));

router.post('/veterinary/cases/:id/visits', allowPortals('farmer'), asyncRoute(async (req, res) => {
  const item = await getCase(req.params.id);
  if (!item || !sameId(item.farmerId, req.user._id)) return notFound(res);
  if (['resolved', 'closed'].includes(item.status)) return res.status(409).json({ message: 'This case is already closed.' });
  const preferredDate = req.body?.preferredDate ? new Date(req.body.preferredDate) : null;
  if (preferredDate && Number.isNaN(preferredDate.getTime())) return res.status(400).json({ message: 'Invalid preferred visit date.' });
  const visit = await VetVisitRequest.create({
    caseId: item._id,
    farmerId: req.user._id,
    preferredDate,
    availabilityNote: String(req.body?.availabilityNote || '').trim().slice(0, 1000),
  });
  item.status = 'visit_requested';
  await item.save();
  await Promise.all([
    audit(req, 'veterinary.visit.requested', 'VetVisitRequest', visit._id, { caseId: item._id }),
    notifyRegionalVets(item.location, 'Veterinary visit requested', `A visit was requested for: ${item.issueTitle}.`, 'vet_visit', visit._id),
  ]);
  data(res, visit, 201);
}));

router.get('/veterinary/visits', allowPortals('farmer', 'sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  let caseIds;
  if (req.user.portal === 'farmer') caseIds = await VeterinaryCase.find({ farmerId: req.user._id }).distinct('_id');
  else caseIds = await VeterinaryCase.find(buildRegionFilter(req.user, 'location')).distinct('_id');
  const visits = await VetVisitRequest.find({ caseId: { $in: caseIds } })
    .populate('caseId')
    .populate('farmerId', 'fullName phone')
    .populate('officerId', 'fullName portal')
    .sort({ createdAt: -1 }).limit(200).lean();
  data(res, visits);
}));

router.patch('/veterinary/visits/:id', allowPortals('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return notFound(res);
  const visit = await VetVisitRequest.findById(req.params.id).populate('caseId');
  if (!visit?.caseId || !canAccessRegion(req.user, visit.caseId.location)) return notFound(res);
  const { status, officerNote = '' } = req.body || {};
  if (!['accepted', 'rejected', 'completed'].includes(status)) return res.status(400).json({ message: 'Invalid visit decision.' });
  visit.status = status;
  visit.officerId = req.user._id;
  visit.officerNote = String(officerNote).trim().slice(0, 1000);
  await visit.save();
  if (status === 'accepted') {
    visit.caseId.status = 'assigned';
    visit.caseId.assignedOfficerId = req.user._id;
  } else if (status === 'completed') {
    visit.caseId.status = 'resolved';
    visit.caseId.resolvedAt = new Date();
  }
  await visit.caseId.save();
  await Promise.all([
    audit(req, 'veterinary.visit.updated', 'VetVisitRequest', visit._id, { status }),
    notifyUser(visit.farmerId, 'Veterinary visit updated', `Your visit request is ${status}. ${visit.officerNote}`, 'vet_visit', visit._id),
  ]);
  data(res, visit);
}));

// -----------------------------------------------------------------------------
// OFFICIAL PRICES: only RAB can publish or amend authoritative price records.
// -----------------------------------------------------------------------------
router.get('/prices', asyncRoute(async (req, res) => {
  const now = new Date();
  const filter = req.user.portal === 'rab'
    ? {}
    : { status: 'published', effectiveFrom: { $lte: now }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: now } }] };
  const items = await OfficialPrice.find(filter).sort({ commodity: 1, effectiveFrom: -1 }).limit(500).lean();
  data(res, items);
}));

router.post('/prices', allowPortals('rab'), asyncRoute(async (req, res) => {
  const { commodity, grade = 'standard', unit, priceRwf, effectiveFrom, effectiveTo, status = 'draft', source = 'Official government price' } = req.body || {};
  if (!commodity?.trim() || !unit?.trim() || !Number.isFinite(Number(priceRwf)) || Number(priceRwf) < 0 || !effectiveFrom) {
    return res.status(400).json({ message: 'Commodity, unit, non-negative price and effective date are required.' });
  }
  if (!['draft', 'published'].includes(status)) return res.status(400).json({ message: 'Invalid initial price status.' });
  const start = new Date(effectiveFrom);
  const end = effectiveTo ? new Date(effectiveTo) : null;
  if (Number.isNaN(start.getTime()) || (end && (Number.isNaN(end.getTime()) || end < start))) return res.status(400).json({ message: 'Invalid price effective date range.' });
  const item = await OfficialPrice.create({ commodity: commodity.trim(), grade, unit: unit.trim(), priceRwf: Number(priceRwf), effectiveFrom: start, effectiveTo: end, status, source: String(source).trim(), createdBy: req.user._id });
  await audit(req, 'prices.created', 'OfficialPrice', item._id, { commodity: item.commodity, status });
  data(res, item, 201);
}));

router.patch('/prices/:id', allowPortals('rab'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return notFound(res);
  const item = await OfficialPrice.findById(req.params.id);
  if (!item) return notFound(res);
  const { priceRwf, effectiveFrom, effectiveTo, status, source, grade } = req.body || {};
  if (priceRwf !== undefined) {
    if (!Number.isFinite(Number(priceRwf)) || Number(priceRwf) < 0) return res.status(400).json({ message: 'Price must be non-negative.' });
    item.priceRwf = Number(priceRwf);
  }
  if (effectiveFrom !== undefined) item.effectiveFrom = new Date(effectiveFrom);
  if (effectiveTo !== undefined) item.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;
  if (status !== undefined) {
    if (!['draft', 'published', 'archived'].includes(status)) return res.status(400).json({ message: 'Invalid price status.' });
    item.status = status;
  }
  if (source !== undefined) item.source = String(source).trim();
  if (grade !== undefined) item.grade = String(grade).trim();
  if (Number.isNaN(item.effectiveFrom.getTime()) || (item.effectiveTo && Number.isNaN(item.effectiveTo.getTime())) || (item.effectiveTo && item.effectiveTo < item.effectiveFrom)) {
    return res.status(400).json({ message: 'Invalid price effective date range.' });
  }
  await item.save();
  await audit(req, 'prices.updated', 'OfficialPrice', item._id, { status: item.status });
  data(res, item);
}));

// NSG and RAB audit access is intentionally separated from ordinary portal data.
router.get('/audit/events', allowPortals('nsg', 'rab'), asyncRoute(async (req, res) => {
  const { action, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (action) filter.action = String(action);
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const [items, total] = await Promise.all([
    AuditEvent.find(filter).populate('actorId', 'fullName portal').sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    AuditEvent.countDocuments(filter),
  ]);
  data(res, { items, total, page: safePage, pages: Math.ceil(total / safeLimit) });
}));

export default router;
