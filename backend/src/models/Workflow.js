import mongoose from 'mongoose';

const { Schema, Types } = mongoose;
const timestamps = { timestamps: true };

const regionSchema = new Schema({
  province: { type: String, required: true, trim: true, index: true },
  district: { type: String, required: true, trim: true, index: true },
  sector: { type: String, required: true, trim: true, index: true },
  cell: { type: String, trim: true, default: '' },
  village: { type: String, trim: true, default: '' },
}, { _id: false });

const demandRequestSchema = new Schema({
  customerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  productName: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, enum: ['crops', 'livestock', 'dairy', 'eggs', 'meat', 'seeds', 'other'], default: 'other' },
  quantity: { type: Number, required: true, min: 0.01 },
  unit: { type: String, required: true, trim: true, maxlength: 30 },
  budgetPerUnit: { type: Number, min: 0 },
  requiredBy: Date,
  location: { type: regionSchema, required: true },
  notes: { type: String, trim: true, maxlength: 2000, default: '' },
  status: { type: String, enum: ['open', 'contacted', 'fulfilled', 'cancelled'], default: 'open', index: true },
  interestedFarmerIds: [{ type: Types.ObjectId, ref: 'User' }],
}, timestamps);
demandRequestSchema.index({ status: 1, 'location.province': 1, 'location.district': 1, 'location.sector': 1, createdAt: -1 });
export const DemandRequest = mongoose.models.DemandRequest || mongoose.model('DemandRequest', demandRequestSchema);

const conversationSchema = new Schema({
  participants: [{ type: Types.ObjectId, ref: 'User', required: true }],
  subject: { type: String, trim: true, maxlength: 160, default: 'AHub conversation' },
  contextType: { type: String, enum: ['general', 'product', 'order', 'demand', 'veterinary'], default: 'general' },
  contextId: { type: Types.ObjectId, default: null },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  lastMessagePreview: { type: String, maxlength: 180, default: '' },
}, timestamps);
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
export const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

const messageSchema = new Schema({
  conversationId: { type: Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderId: { type: Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, maxlength: 5000 },
  attachments: [{ url: String, name: String, mimeType: String }],
  readBy: [{ type: Types.ObjectId, ref: 'User' }],
}, timestamps);
messageSchema.index({ conversationId: 1, createdAt: -1 });
export const ConversationMessage = mongoose.models.ConversationMessage || mongoose.model('ConversationMessage', messageSchema);

const veterinaryCaseSchema = new Schema({
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  productionUnitId: { type: Types.ObjectId, ref: 'ProductionUnit', default: null },
  location: { type: regionSchema, required: true },
  category: { type: String, enum: ['livestock', 'crop', 'general'], required: true },
  issueTitle: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  urgency: { type: String, enum: ['low', 'normal', 'high', 'emergency'], default: 'normal', index: true },
  status: { type: String, enum: ['open', 'assigned', 'visit_requested', 'in_progress', 'resolved', 'closed'], default: 'open', index: true },
  assignedOfficerId: { type: Types.ObjectId, ref: 'User', default: null, index: true },
  resolution: { type: String, trim: true, maxlength: 3000, default: '' },
  resolvedAt: Date,
}, timestamps);
veterinaryCaseSchema.index({ status: 1, 'location.province': 1, 'location.district': 1, 'location.sector': 1, createdAt: -1 });
export const VeterinaryCase = mongoose.models.VeterinaryCase || mongoose.model('VeterinaryCase', veterinaryCaseSchema);

const vetVisitRequestSchema = new Schema({
  caseId: { type: Types.ObjectId, ref: 'VeterinaryCase', required: true, index: true },
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  preferredDate: { type: Date, default: null },
  availabilityNote: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'], default: 'pending', index: true },
  officerId: { type: Types.ObjectId, ref: 'User', default: null },
  officerNote: { type: String, trim: true, maxlength: 1000, default: '' },
}, timestamps);
export const VetVisitRequest = mongoose.models.VetVisitRequest || mongoose.model('VetVisitRequest', vetVisitRequestSchema);

const officialPriceSchema = new Schema({
  commodity: { type: String, required: true, trim: true, maxlength: 120, index: true },
  grade: { type: String, trim: true, default: 'standard' },
  unit: { type: String, required: true, trim: true, maxlength: 30 },
  priceRwf: { type: Number, required: true, min: 0 },
  source: { type: String, trim: true, default: 'Official government price' },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date, default: null },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  createdBy: { type: Types.ObjectId, ref: 'User', required: true },
}, timestamps);
officialPriceSchema.index({ commodity: 1, status: 1, effectiveFrom: -1 });
export const OfficialPrice = mongoose.models.OfficialPrice || mongoose.model('OfficialPrice', officialPriceSchema);

const auditEventSchema = new Schema({
  actorId: { type: Types.ObjectId, ref: 'User', default: null, index: true },
  actorPortal: { type: String, default: '' },
  action: { type: String, required: true, index: true },
  targetType: { type: String, required: true },
  targetId: { type: Types.ObjectId, default: null },
  region: { province: String, district: String, sector: String },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, timestamps);
auditEventSchema.index({ createdAt: -1, action: 1 });
export const AuditEvent = mongoose.models.AuditEvent || mongoose.model('AuditEvent', auditEventSchema);
