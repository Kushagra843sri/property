import { Schema, model, type InferSchemaType } from 'mongoose';

// flat = 1/2/3 BHK flat; pg = paying-guest room; room = furnished room. BHK applies to flats only.
export const PROPERTY_TYPES = [
  'flat',
  'shop',
  'office',
  'pg',
  'room',
  'villa',
  'house',
  'plot',
  'commercial',
  'other',
] as const;
export const PURPOSES = ['buy', 'rent'] as const;
export const PROPERTY_STATUSES = ['available', 'sold', 'rented', 'hidden'] as const;
export const FURNISHINGS = ['unfurnished', 'semi-furnished', 'furnished'] as const;
export const AREA_UNITS = ['sqft', 'sqyd', 'sqm', 'acre'] as const;
export const PRICE_UNITS = ['total', 'per-month'] as const;

const propertySchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '', maxlength: 5000 },
    type: { type: String, enum: PROPERTY_TYPES, required: true },
    purpose: { type: String, enum: PURPOSES, required: true },
    price: { type: Number, required: true, min: 0 },
    priceUnit: { type: String, enum: PRICE_UNITS, default: 'total' },
    bhk: { type: Number, min: 0, max: 20 },
    bathrooms: { type: Number, min: 0, max: 20 },
    carpetArea: { type: Number, min: 0 },
    builtUpArea: { type: Number, min: 0 },
    areaUnit: { type: String, enum: AREA_UNITS, default: 'sqft' },
    furnishing: { type: String, enum: FURNISHINGS },
    floor: { type: Number },
    totalFloors: { type: Number, min: 0 },
    facing: { type: String, maxlength: 30 },
    ageOfProperty: { type: Number, min: 0 },
    possession: { type: String, maxlength: 60 },
    address: {
      line: { type: String, maxlength: 200 },
      locality: { type: String, maxlength: 100 },
      city: { type: String, required: true, maxlength: 80 },
      state: { type: String, maxlength: 80 },
      pincode: { type: String, maxlength: 10 },
    },
    geo: { lat: { type: Number, min: -90, max: 90 }, lng: { type: Number, min: -180, max: 180 } },
    amenities: { type: [{ type: String, maxlength: 60 }], default: [] },
    images: [
      {
        _id: false,
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        alt: { type: String, default: '', maxlength: 200 },
        order: { type: Number, default: 0 },
      },
    ],
    status: { type: String, enum: PROPERTY_STATUSES, default: 'available' },
    featured: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

propertySchema.index({ status: 1, 'address.city': 1, purpose: 1, type: 1, price: 1 });
propertySchema.index({ bhk: 1 });
propertySchema.index({ featured: 1, createdAt: -1 });
propertySchema.index({ title: 'text', 'address.locality': 'text' });

export type PropertyDoc = InferSchemaType<typeof propertySchema>;
export const Property = model('Property', propertySchema);
