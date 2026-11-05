import { Types } from 'mongoose';
import { Interest } from '../../models/interest.js';
import { Property } from '../../models/property.js';
import { User } from '../../models/user.js';
import { AppError } from '../../utils/errors.js';
import { pageMeta } from '../../utils/pagination.js';
import { listingUrl, notifyDealer } from '../notifications/service.js';
import { toPublic } from '../properties/service.js';

/**
 * Idempotent: a repeat call returns the existing interest and does not notify the dealer again.
 * The unique (user, property) index is the real guard against double clicks racing each other.
 */
export async function addInterest(userId: string, propertyId: string) {
  const [user, property] = await Promise.all([
    User.findById(userId).lean(),
    Property.findOne({ _id: propertyId, status: { $ne: 'hidden' } }).lean(),
  ]);
  if (!user) throw AppError.unauthorized();
  if (!property) throw AppError.notFound('Property not found');
  if (user.status !== 'active' || !user.consent?.given)
    throw AppError.forbidden('Consent to be contacted is required');
  if (property.status !== 'available') throw AppError.conflict('Property is no longer available');

  const res = await Interest.updateOne(
    { user: userId, property: propertyId },
    { $setOnInsert: { notified: false } },
    { upsert: true },
  );
  const created = res.upsertedCount === 1;

  if (created) {
    const sent = await notifyDealer(
      `New interest: ${property.title}`,
      [
        `${user.name} is interested in "${property.title}".`,
        '',
        `Name: ${user.name}`,
        `Phone: ${user.phone}`,
        `Email: ${user.email}`,
        `Listing: ${listingUrl(property.slug)}`,
      ].join('\n'),
    );
    if (sent) await Interest.updateOne({ _id: res.upsertedId }, { $set: { notified: true } });
  }
  return { interested: true, created };
}

export async function removeInterest(userId: string, propertyId: string) {
  await Interest.deleteOne({ user: userId, property: propertyId });
  return { interested: false };
}

export async function listMyInterests(userId: string, page: number, limit: number) {
  const filter = { user: new Types.ObjectId(userId) };
  const [rows, total] = await Promise.all([
    Interest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Interest.countDocuments(filter),
  ]);
  // One query for all properties (no N+1); hidden ones are not shown to the user.
  const props = await Property.find({
    _id: { $in: rows.map((r) => r.property) },
    status: { $ne: 'hidden' },
  }).lean();
  const byId = new Map(props.map((p) => [String(p._id), p]));
  const items = rows.flatMap((r) => {
    const p = byId.get(String(r.property));
    return p ? [{ createdAt: r.createdAt, property: toPublic(p) }] : [];
  });
  return { items, meta: pageMeta(page, limit, total) };
}
