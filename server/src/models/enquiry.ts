import { Schema, model } from 'mongoose';

export const ENQUIRY_STATUSES = ['new', 'contacted', 'closed'] as const;

const enquirySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, maxlength: 16 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    property: { type: Schema.Types.ObjectId, ref: 'Property' },
    status: { type: String, enum: ENQUIRY_STATUSES, default: 'new' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

enquirySchema.index({ status: 1, createdAt: -1 });

export const Enquiry = model('Enquiry', enquirySchema);
