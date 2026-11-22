import mongoose from 'mongoose';

const mfaChallengeSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  otpHash: { type: String, default: '' },
  consumedAt: { type: Date, default: null },
  attempts: { type: Number, default: 0 },
}, { timestamps: true });

mfaChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.models.MfaChallenge || mongoose.model('MfaChallenge', mfaChallengeSchema);
