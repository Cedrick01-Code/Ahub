import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { OfficialPrice, DemandRequest, Conversation, Message, Delivery } from '../models/Commerce.js';
import { Order, Product } from '../models/Operations.js';

const router = express.Router();
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const roles = (...allowed) => (req, res, next) => allowed.includes(req.user.portal) ? next() : res.status(403).json({ message: 'This portal cannot perform that action.' });
const validId = value => mongoose.isValidObjectId(value);
const auth = asyncRoute(async (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return res.status(503).json({ message: 'Authentication is not configured.' });
  const [scheme, token] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'A valid active session is required.' });
  try {
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active' || Number(user.tokenVersion || 0) !== Number(payload.tokenVersion || 0)) return res.status(401).json({ message: 'A valid active session is required.' });
    req.user = user; next();
  } catch { return res.status(401).json({ message: 'A valid active session is required.' }); }
});
const participant = (conversation, userId) => conversation.participantIds.some(id => String(id) === String(userId));

// Official prices: RAB publishes national or geographically scoped government prices.
router.get('/prices', auth, asyncRoute(async (req, res) => {
  const filter = { status: 'published', effectiveFrom: { $lte: new Date() }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date() } }] };
  if (req.query.province) filter.$and = [...(filter.$and || []), { $or: [{ province: '' }, { province: req.query.province }] }];
  if (req.query.district) filter.$and = [...(filter.$and || []), { $or: [{ district: '' }, { district: req.query.district }] }];
  if (req.query.commodity) filter.commodity = new RegExp(String(req.query.commodity).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const rows = await OfficialPrice.find(filter).sort({ commodity: 1, effectiveFrom: -1 }).limit(300).lean();
  res.json({ data: rows });
}));
router.post('/prices', auth, roles('rab'), asyncRoute(async (req, res) => {
  const { commodity, category, unit, priceRwf, province, district, effectiveFrom, effectiveTo, notes, status } = req.body || {};
  const start = new Date(effectiveFrom);
  const end = effectiveTo ? new Date(effectiveTo) : null;
  if (!String(commodity || '').trim() || !String(unit || '').trim() || !Number.isFinite(Number(priceRwf)) || Number(priceRwf) < 0 || !effectiveFrom || Number.isNaN(start.getTime()) || (end && (Number.isNaN(end.getTime()) || end <= start))) return res.status(400).json({ message: 'Commodity, unit, non-negative price and a valid effective date range are required.' });
  const row = await OfficialPrice.create({ commodity: String(commodity).trim(), category, unit: String(unit).trim(), priceRwf: Number(priceRwf), province: String(province || '').trim(), district: String(district || '').trim(), effectiveFrom, effectiveTo: effectiveTo || null, notes: String(notes || '').slice(0, 2000), status: status === 'published' ? 'published' : 'draft', createdBy: req.user._id });
  res.status(201).json({ data: row });
}));
router.patch('/prices/:id', auth, roles('rab'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: 'Price record not found.' });
  const allowed = ['commodity', 'category', 'unit', 'priceRwf', 'province', 'district', 'effectiveFrom', 'effectiveTo', 'notes', 'status'];
  const updates = Object.fromEntries(allowed.filter(key => Object.hasOwn(req.body || {}, key)).map(key => [key, req.body[key]]));
  if (updates.priceRwf !== undefined && (!Number.isFinite(Number(updates.priceRwf)) || Number(updates.priceRwf) < 0)) return res.status(400).json({ message: 'Price must be a non-negative number.' });
  const row = await OfficialPrice.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
  if (!row) return res.status(404).json({ message: 'Price record not found.' });
  res.json({ data: row });
}));

// Customer demand is separate from an order; farmers respond with offers.
router.post('/market/demand-requests', auth, roles('customer'), asyncRoute(async (req, res) => {
  const { commodity, quantity, unit, targetPriceRwf, requiredBy, province, district, sector, notes } = req.body || {};
  if (!String(commodity || '').trim() || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || !String(unit || '').trim()) return res.status(400).json({ message: 'Commodity, positive quantity and unit are required.' });
  const record = await DemandRequest.create({ customerId: req.user._id, commodity: String(commodity).trim(), quantity: Number(quantity), unit: String(unit).trim(), targetPriceRwf: targetPriceRwf === undefined ? undefined : Number(targetPriceRwf), requiredBy: requiredBy || undefined, province: String(province || req.user.province || '').trim(), district: String(district || req.user.district || '').trim(), sector: String(sector || '').trim(), notes: String(notes || '').slice(0, 2000) });
  res.status(201).json({ data: record });
}));
router.get('/market/demand-requests', auth, asyncRoute(async (req, res) => {
  let filter;
  if (req.user.portal === 'customer') filter = { customerId: req.user._id };
  else if (req.user.portal === 'farmer') filter = { status: 'open', ...(req.user.province ? { province: req.user.province } : {}), ...(req.user.district ? { district: req.user.district } : {}) };
  else if (['sector', 'district', 'province', 'rab'].includes(req.user.portal)) {
    filter = {};
    if (req.user.portal !== 'rab') filter.province = req.user.province;
    if (['sector', 'district'].includes(req.user.portal)) filter.district = req.user.district;
    if (req.user.portal === 'sector') filter.sector = req.user.sector;
  } else return res.status(403).json({ message: 'This portal cannot view demand requests.' });
  if (req.query.status) filter.status = req.query.status;
  const rows = await DemandRequest.find(filter).populate('customerId', 'fullName customerType province district').sort({ createdAt: -1 }).limit(200).lean();
  res.json({ data: rows });
}));
router.post('/market/demand-requests/:id/respond', auth, roles('farmer'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: 'Demand request not found.' });
  const record = await DemandRequest.findOne({ _id: req.params.id, status: 'open', ...(req.user.province ? { province: req.user.province } : {}), ...(req.user.district ? { district: req.user.district } : {}) });
  if (!record) return res.status(404).json({ message: 'Demand request not found.' });
  const { message, offeredQuantity, offeredPriceRwf, productId } = req.body || {};
  if (productId) {
    if (!validId(productId)) return res.status(400).json({ message: 'Invalid product.' });
    const product = await Product.findOne({ _id: productId, farmerId: req.user._id, status: 'available' }).select('_id');
    if (!product) return res.status(400).json({ message: 'The selected product is not an active listing owned by your account.' });
  }
  if (offeredQuantity !== undefined && (!Number.isFinite(Number(offeredQuantity)) || Number(offeredQuantity) <= 0)) return res.status(400).json({ message: 'Offered quantity must be positive.' });
  if (offeredPriceRwf !== undefined && (!Number.isFinite(Number(offeredPriceRwf)) || Number(offeredPriceRwf) < 0)) return res.status(400).json({ message: 'Offered price must be non-negative.' });
  record.responses.push({ farmerId: req.user._id, message: String(message || '').slice(0, 1000), offeredQuantity: offeredQuantity === undefined ? undefined : Number(offeredQuantity), offeredPriceRwf: offeredPriceRwf === undefined ? undefined : Number(offeredPriceRwf), productId: productId || undefined });
  await record.save();
  res.status(201).json({ data: record });
}));
router.patch('/market/demand-requests/:id/status', auth, roles('customer'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: 'Demand request not found.' });
  const status = req.body?.status;
  if (!['fulfilled', 'cancelled', 'matched'].includes(status)) return res.status(400).json({ message: 'Invalid demand request status.' });
  const record = await DemandRequest.findOneAndUpdate({ _id: req.params.id, customerId: req.user._id, status: 'open' }, { $set: { status } }, { new: true, runValidators: true });
  if (!record) return res.status(404).json({ message: 'Demand request not found.' });
  res.json({ data: record });
}));

// Independent inbox and conversations. Every operation checks participant membership.
router.post('/conversations', auth, asyncRoute(async (req, res) => {
  const otherId = req.body?.participantId;
  if (!validId(otherId) || String(otherId) === String(req.user._id)) return res.status(400).json({ message: 'A valid other participant is required.' });
  const other = await User.findOne({ _id: otherId, status: 'active' }).select('_id');
  if (!other) return res.status(404).json({ message: 'Participant not found.' });
  const participants = [req.user._id, other._id].sort((a, b) => String(a).localeCompare(String(b)));
  const contextType = ['general', 'product', 'order', 'demand', 'veterinary'].includes(req.body?.contextType) ? req.body.contextType : 'general';
  const contextId = req.body?.contextId || null;
  if (contextId && !validId(contextId)) return res.status(400).json({ message: 'Invalid conversation context.' });
  let conversation = await Conversation.findOne({ participantIds: { $all: participants, $size: 2 }, contextType, contextId });
  if (!conversation) conversation = await Conversation.create({ participantIds: participants, contextType, contextId });
  res.status(201).json({ data: conversation });
}));
router.get('/conversations', auth, asyncRoute(async (req, res) => {
  const rows = await Conversation.find({ participantIds: req.user._id, archivedFor: { $ne: req.user._id } }).populate('participantIds', 'fullName portal').sort({ lastMessageAt: -1 }).limit(100).lean();
  res.json({ data: rows });
}));
router.get('/conversations/:id/messages', auth, asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: 'Conversation not found.' });
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation || !participant(conversation, req.user._id)) return res.status(404).json({ message: 'Conversation not found.' });
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const messages = await Message.find({ conversationId: conversation._id, deletedAt: null }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
  await Message.updateMany({ conversationId: conversation._id, senderId: { $ne: req.user._id }, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
  res.json({ data: messages.reverse(), page, limit });
}));
router.post('/conversations/:id/messages', auth, asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: 'Conversation not found.' });
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation || !participant(conversation, req.user._id)) return res.status(404).json({ message: 'Conversation not found.' });
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ message: 'Message text is required.' });
  const message = await Message.create({ conversationId: conversation._id, senderId: req.user._id, body, attachments: Array.isArray(req.body?.attachments) ? req.body.attachments.filter(x => typeof x === 'string').slice(0, 5) : [], readBy: [req.user._id] });
  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = body.slice(0, 160);
  await conversation.save();
  res.status(201).json({ data: message });
}));

// Delivery lifecycle is attached to an accepted existing order.
router.post('/deliveries', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const { orderId, method, deliveryAddress, estimatedAt, notes } = req.body || {};
  if (!validId(orderId)) return res.status(400).json({ message: 'A valid order ID is required.' });
  const order = await Order.findOne({ _id: orderId, farmerId: req.user._id, status: 'approved' });
  if (!order) return res.status(404).json({ message: 'Approved order not found.' });
  const delivery = await Delivery.findOneAndUpdate({ orderId: order._id }, { $setOnInsert: { orderId: order._id, customerId: order.customerId, farmerId: req.user._id, province: req.user.province || '', district: req.user.district || '', sector: req.user.sector || '', method, deliveryAddress, estimatedAt, notes, events: [{ status: 'pending', note: 'Delivery record created', actorId: req.user._id }] } }, { upsert: true, new: true, runValidators: true });
  res.status(201).json({ data: delivery });
}));
router.get('/deliveries', auth, asyncRoute(async (req, res) => {
  const filter = req.user.portal === 'farmer' ? { farmerId: req.user._id } : req.user.portal === 'customer' ? { customerId: req.user._id } : ['rab', 'province', 'district', 'sector'].includes(req.user.portal) ? { ...(req.user.portal !== 'rab' ? { province: req.user.province } : {}) } : null;
  if (!filter) return res.status(403).json({ message: 'This portal cannot view deliveries.' });
  const rows = await Delivery.find(filter).populate('orderId').populate('customerId', 'fullName phone').populate('farmerId', 'fullName phone').sort({ createdAt: -1 }).limit(200).lean();
  res.json({ data: rows });
}));
router.patch('/deliveries/:id/status', auth, asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: 'Delivery not found.' });
  const record = await Delivery.findById(req.params.id);
  if (!record || !['farmer', 'customer'].includes(req.user.portal) || (String(record.farmerId) !== String(req.user._id) && String(record.customerId) !== String(req.user._id))) return res.status(404).json({ message: 'Delivery not found.' });
  const transitions = { pending: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'], ready: ['dispatched', 'in_transit'], dispatched: ['in_transit', 'delivered', 'failed'], in_transit: ['delivered', 'failed'], failed: ['preparing'], delivered: [], cancelled: [] };
  const next = req.body?.status;
  if (!transitions[record.status]?.includes(next)) return res.status(400).json({ message: 'This delivery status transition is not allowed.' });
  if (req.user.portal === 'customer' && next !== 'delivered') return res.status(403).json({ message: 'Customers can only confirm delivery.' });
  record.status = next;
  if (next === 'delivered') record.deliveredAt = new Date();
  record.events.push({ status: next, note: String(req.body?.note || '').slice(0, 1000), actorId: req.user._id });
  await record.save();
  res.json({ data: record });
}));
export default router;
