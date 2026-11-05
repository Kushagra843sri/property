import { Schema, model } from 'mongoose';

const interestSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    notified: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One interest per user per listing; also guarantees double-clicks never duplicate.
interestSchema.index({ user: 1, property: 1 }, { unique: true });
interestSchema.index({ property: 1, createdAt: -1 });
interestSchema.index({ createdAt: -1 });

export const Interest = model('Interest', interestSchema);
