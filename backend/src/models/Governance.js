import mongoose from 'mongoose';

const { Schema, Types } = mongoose;
const options = { timestamps: true };

const veterinaryCaseSchema = new Schema({
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  productionUnitId: { type: Types.ObjectId, ref: 'ProductionUnit', default: null, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  category: { type: String, enum: ['animal_health', 'crop_health', 'pest', 'disease', 'vaccination', 'general'], default: 'animal_health', index: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
  status: { type: String, enum: ['open', 'assigned', 'scheduled', 'in_progress', 'escalated', 'resolved', 'closed'], default: 'open', index: true },
  province: { type: String, required: true, index: true },
  district: { type: String, required: true, index: true },
  sector: { type: String, required: true, index: true },
  assignedOfficerId: { type: Types.ObjectId, ref: 'User', default: null, index: true },
  requestedVisitAt: Date,
  scheduledVisitAt: Date,
  diagnosis: String,
  treatment: String,
  resolution: String,
  resolvedAt: Date,
  closedAt: Date,
  attachments: [{ type: String }],
  history: [{
    action: { type: String, required: true },
    note: String,
    actorId: { type: Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  }],
}, options);
veterinaryCaseSchema.index({ province: 1, district: 1, sector: 1, status: 1, createdAt: -1 });
export const VeterinaryCase = mongoose.models.VeterinaryCase || mongoose.model('VeterinaryCase', veterinaryCaseSchema);

const auditEventSchema = new Schema({
  actorId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  actorPortal: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  resourceType: { type: String, required: true, index: true },
  resourceId: { type: String, default: '' },
  outcome: { type: String, enum: ['success', 'denied'], default: 'success', index: true },
  ipAddress: String,
  userAgent: String,
  metadata: { type: Schema.Types.Mixed, default: {} },
}, options);
auditEventSchema.index({ createdAt: -1 });
export const AuditEvent = mongoose.models.AuditEvent || mongoose.model('AuditEvent', auditEventSchema);
