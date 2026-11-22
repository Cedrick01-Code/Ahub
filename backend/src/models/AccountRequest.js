import mongoose from 'mongoose';

const accountRequestSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    organization: {
      type: String,
      default: '',
    },
    position: {
      type: String,
      default: '',
    },
    province: { type: String, default: '' },
    district: { type: String, default: '' },
    sector: { type: String, default: '' },
    portal: {
      type: String,
      enum: ['rab', 'province', 'district', 'sector', 'farmer', 'customer', 'nsg'],
      required: true,
    },
    role: {
      type: String,
      enum: ['rab', 'province', 'district', 'sector', 'farmer', 'customer', 'nsg'],
      required: true,
    },
    regionScope: {
      type: String,
      default: '',
    },
    parentRegionScope: {
      type: String,
      default: '',
    },
    parentPortal: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected', 'activated'],
      default: 'pending_approval',
    },
    accessCodeHash: {
      type: String,
      default: '',
    },
    accessCodeExpiresAt: {
      type: Date,
      default: null,
    },
    approverName: {
      type: String,
      default: '',
    },
    approverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.AccountRequest || mongoose.model('AccountRequest', accountRequestSchema);
