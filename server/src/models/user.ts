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
    phone: { type: String, required: true, unique: true, trim: true, maxlength: 16 }, // E.164
    role: { type: String, enum: ROLES, default: 'user', index: true },
    passwordHash: { type: String, select: false }, // admin only
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
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

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
