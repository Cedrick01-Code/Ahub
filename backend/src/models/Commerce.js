import mongoose from 'mongoose';
const { Schema, Types } = mongoose;
const opts = { timestamps: true };

const officialPriceSchema = new Schema({
  commodity: { type: String, required: true, trim: true, maxlength: 120, index: true },
  category: { type: String, enum: ['crops', 'livestock', 'dairy', 'poultry', 'fish', 'processed', 'other'], default: 'other' },
  unit: { type: String, required: true, trim: true, maxlength: 40 },
  priceRwf: { type: Number, required: true, min: 0 },
  province: { type: String, default: '', index: true },
  district: { type: String, default: '', index: true },
  effectiveFrom: { type: Date, required: true, index: true },
  effectiveTo: { type: Date, default: null },
  status: { type: String, enum: ['draft', 'published', 'expired'], default: 'draft', index: true },
  createdBy: { type: Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, maxlength: 2000, default: '' },
}, opts);
officialPriceSchema.index({ commodity: 1, province: 1, district: 1, effectiveFrom: -1 });
export const OfficialPrice = mongoose.models.OfficialPrice || mongoose.model('OfficialPrice', officialPriceSchema);

const demandRequestSchema = new Schema({
  customerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  commodity: { type: String, required: true, trim: true, maxlength: 120, index: true },
  quantity: { type: Number, required: true, min: 0.01 },
  unit: { type: String, required: true, trim: true, maxlength: 40 },
  targetPriceRwf: { type: Number, min: 0 },
  requiredBy: Date,
  province: { type: String, default: '', index: true },
  district: { type: String, default: '', index: true },
  sector: { type: String, default: '' },
  notes: { type: String, maxlength: 2000, default: '' },
  status: { type: String, enum: ['open', 'matched', 'fulfilled', 'cancelled', 'expired'], default: 'open', index: true },
  responses: [{
    farmerId: { type: Types.ObjectId, ref: 'User', required: true },
    message: { type: String, maxlength: 1000, default: '' },
    offeredQuantity: { type: Number, min: 0 },
    offeredPriceRwf: { type: Number, min: 0 },
    productId: { type: Types.ObjectId, ref: 'Product' },
    createdAt: { type: Date, default: Date.now },
  }],
}, opts);
demandRequestSchema.index({ status: 1, province: 1, district: 1, commodity: 1 });
export const DemandRequest = mongoose.models.DemandRequest || mongoose.model('DemandRequest', demandRequestSchema);

const conversationSchema = new Schema({
  participantIds: [{ type: Types.ObjectId, ref: 'User', required: true }],
  contextType: { type: String, enum: ['general', 'product', 'order', 'demand', 'veterinary'], default: 'general' },
  contextId: { type: Types.ObjectId, default: null },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  lastMessagePreview: { type: String, default: '' },
  archivedFor: [{ type: Types.ObjectId, ref: 'User' }],
}, opts);
conversationSchema.index({ participantIds: 1, lastMessageAt: -1 });
export const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

const messageSchema = new Schema({
  conversationId: { type: Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  body: { type: String, required: true, trim: true, maxlength: 5000 },
  attachments: [{ type: String }],
  readBy: [{ type: Types.ObjectId, ref: 'User' }],
  editedAt: Date,
  deletedAt: Date,
}, opts);
messageSchema.index({ conversationId: 1, createdAt: -1 });
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

const deliverySchema = new Schema({
  orderId: { type: Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
  customerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  method: { type: String, enum: ['pickup', 'farmer_delivery', 'third_party'], default: 'pickup' },
  status: { type: String, enum: ['pending', 'preparing', 'ready', 'dispatched', 'in_transit', 'delivered', 'failed', 'cancelled'], default: 'pending', index: true },
  deliveryAddress: { type: String, maxlength: 500, default: '' },
  trackingReference: { type: String, maxlength: 100, default: '' },
  estimatedAt: Date,
  deliveredAt: Date,
  notes: { type: String, maxlength: 2000, default: '' },
  events: [{ status: String, note: String, actorId: { type: Types.ObjectId, ref: 'User' }, createdAt: { type: Date, default: Date.now } }],
}, opts);
export const Delivery = mongoose.models.Delivery || mongoose.model('Delivery', deliverySchema);
