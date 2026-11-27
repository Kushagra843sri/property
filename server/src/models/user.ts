import { Schema, model, type InferSchemaType } from 'mongoose';

export const ROLES = ['user', 'admin'] as const;
export type Role = (typeof ROLES)[number];
export const LEAD_STATUSES = ['new', 'contacted', 'interested', 'closed'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // E.164. Optional (Google sign-ups add it later); never store '' so the partial index below holds.
    phone: { type: String, trim: true, maxlength: 16 },
    role: { type: String, enum: ROLES, default: 'user', index: true },
    // argon2id. Admins: set by CLI. Users: set only after they prove they own the email (OTP).
    passwordHash: { type: String, select: false },
    googleSub: { type: String, select: false }, // Google account id, set on Google sign-in
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false }, // unused: phones are collected, not verified
    consent: {
      given: { type: Boolean, default: false },
      at: Date,
      version: String,
      ip: String,
    },
    status: { type: String, enum: ['active', 'withdrawn'], default: 'active', index: true },
    leadStatus: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },
    adminNotes: [
      {
        _id: false,
        text: { type: String, required: true, maxlength: 2000 },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

userSchema.index({ createdAt: -1 });
// Unique only where present, so many users can have no phone / no Google account.
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } },
);
userSchema.index(
  { googleSub: 1 },
  { unique: true, partialFilterExpression: { googleSub: { $type: 'string' } } },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
