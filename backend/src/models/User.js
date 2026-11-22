import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
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
    status: {
      type: String,
      enum: ['pending_approval', 'active', 'suspended', 'rejected'],
      default: 'pending_approval',
    },
    regionScope: {
      type: String,
      default: '',
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
    enterpriseIds: { type: [String], default: [] },
    customerType: {
      type: String,
      enum: ['household', 'retailer', 'restaurant_hotel', 'processor', 'exporter', ''],
      default: '',
    },
    parentApprovalRequired: {
      type: Boolean,
      default: false,
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    totpSecretEncrypted: { type: String, default: '' },
    totpPendingSecretEncrypted: { type: String, default: '' },
    totpPendingExpiresAt: { type: Date, default: null },
    totpLastUsedStep: { type: Number, default: 0 },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model('User', userSchema);
