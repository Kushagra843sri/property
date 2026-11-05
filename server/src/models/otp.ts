import { Schema, model } from 'mongoose';

// Implementation detail of the approved OTP design (hashed at rest, expiring, attempt-limited).
const otpSchema = new Schema({
  identifier: { type: String, required: true, unique: true }, // normalized email or E.164 phone
  channel: { type: String, enum: ['email', 'phone'], required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL cleanup

export const Otp = model('Otp', otpSchema);
