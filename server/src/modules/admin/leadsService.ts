import { Types } from 'mongoose';
import { Enquiry } from '../../models/enquiry.js';
import { Interest } from '../../models/interest.js';
import { Property } from '../../models/property.js';
import { User } from '../../models/user.js';
import { AppError } from '../../utils/errors.js';
import { pageMeta } from '../../utils/pagination.js';
import { csvRow } from '../../utils/csv.js';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const skip = (page: number, limit: number) => (page - 1) * limit;

type LeanUser = {
  _id: unknown;
  name: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: string;
  leadStatus: string;
  consent?: { given?: boolean | null; at?: Date | null } | null;
  adminNotes?: unknown[];
  createdAt?: Date;
};
const leadUser = (u: LeanUser) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  phone: u.phone,
  emailVerified: u.emailVerified,
  phoneVerified: u.phoneVerified,
  status: u.status,
  leadStatus: u.leadStatus,
  consentGiven: !!u.consent?.given,
  consentAt: u.consent?.at,
  adminNotes: u.adminNotes ?? [],
  createdAt: u.createdAt,
});

export async function listUsers(q: {
  leadStatus?: string;
  status?: string;
  q?: string;
  page: number;
  limit: number;
}) {
  const filter: Record<string, unknown> = { role: 'user' };
  if (q.leadStatus) filter.leadStatus = q.leadStatus;
  if (q.status) filter.status = q.status;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip(q.page, q.limit))
      .limit(q.limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  // Interest counts for the page in one aggregation (no per-user query).
  const counts = await Interest.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { user: { $in: users.map((u) => u._id) } } },
    { $group: { _id: '$user', n: { $sum: 1 } } },
  ]);
  const byUser = new Map(counts.map((c) => [String(c._id), c.n]));
  return {
    items: users.map((u) => ({ ...leadUser(u), interestCount: byUser.get(String(u._id)) ?? 0 })),
    meta: pageMeta(q.page, q.limit, total),
  };
}

export async function updateUser(
  adminId: string,
  id: string,
  body: { leadStatus?: string | undefined; note?: string | undefined },
) {
  const update: Record<string, unknown> = {};
  if (body.leadStatus) update.$set = { leadStatus: body.leadStatus };
  if (body.note) update.$push = { adminNotes: { text: body.note, by: adminId, at: new Date() } };
  const user = await User.findOneAndUpdate({ _id: id, role: 'user' }, update, {
    returnDocument: 'after',
  }).lean();
  if (!user) throw AppError.notFound('User not found');
  return leadUser(user);
}

export async function listInterests(q: {
  property?: string;
  user?: string;
  from?: Date | undefined;
  to?: Date | undefined;
  page: number;
  limit: number;
}) {
  const filter: Record<string, unknown> = {};
  if (q.property) filter.property = q.property;
  if (q.user) filter.user = q.user;
  if (q.from || q.to) {
    filter.createdAt = { ...(q.from && { $gte: q.from }), ...(q.to && { $lte: q.to }) };
  }
  const [rows, total] = await Promise.all([
    Interest.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip(q.page, q.limit))
      .limit(q.limit)
      .lean(),
    Interest.countDocuments(filter),
  ]);
  const [users, props] = await Promise.all([
    User.find({ _id: { $in: rows.map((r) => r.user) } })
      .select('name email phone status leadStatus')
      .lean(),
    Property.find({ _id: { $in: rows.map((r) => r.property) } })
      .select('title slug status')
      .lean(),
  ]);
  const uMap = new Map(users.map((u) => [String(u._id), u]));
  const pMap = new Map(props.map((p) => [String(p._id), p]));
  const items = rows.map((r) => {
    const u = uMap.get(String(r.user));
    const p = pMap.get(String(r.property));
    return {
      id: String(r._id),
      createdAt: r.createdAt,
      notified: r.notified,
      user: u && {
        id: String(u._id),
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        leadStatus: u.leadStatus,
      },
      property: p && { id: String(p._id), title: p.title, slug: p.slug, status: p.status },
    };
  });
  return { items, meta: pageMeta(q.page, q.limit, total) };
}

type LeanEnquiry = {
  _id: unknown;
  name: string;
  email: string;
  phone: string;
  message: string;
  property?: unknown;
  status: string;
  createdAt?: Date;
};
const enquiryOut = (e: LeanEnquiry) => ({
  id: String(e._id),
  name: e.name,
  email: e.email,
  phone: e.phone,
  message: e.message,
  property: e.property ? String(e.property) : null,
  status: e.status,
  createdAt: e.createdAt,
});

export async function listEnquiries(q: { status?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = q.status ? { status: q.status } : {};
  const [rows, total] = await Promise.all([
    Enquiry.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip(q.page, q.limit))
      .limit(q.limit)
      .lean(),
    Enquiry.countDocuments(filter),
  ]);
  return { items: rows.map(enquiryOut), meta: pageMeta(q.page, q.limit, total) };
}

export async function updateEnquiry(id: string, status: string) {
  const e = await Enquiry.findByIdAndUpdate(
    id,
    { $set: { status } },
    { returnDocument: 'after' },
  ).lean();
  if (!e) throw AppError.notFound('Enquiry not found');
  return enquiryOut(e);
}

/**
 * Lead export. Only active users who still consent are included: withdrawn users are excluded
 * per the privacy rules. Streamed with a cursor so memory stays flat.
 */
export async function* leadsCsv(): AsyncGenerator<string> {
  yield csvRow(['Name', 'Email', 'Phone', 'Lead status', 'Interests', 'Consent date', 'Signed up']);
  // One grouped query for all interest counts instead of a query per user.
  const counts = await Interest.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $group: { _id: '$user', n: { $sum: 1 } } },
  ]);
  const byUser = new Map(counts.map((c) => [String(c._id), c.n]));
  const cursor = User.find({ role: 'user', status: 'active', 'consent.given': true })
    .sort({ createdAt: 1 })
    .lean()
    .cursor();
  for await (const u of cursor) {
    yield csvRow([
      u.name,
      u.email,
      u.phone,
      u.leadStatus,
      byUser.get(String(u._id)) ?? 0,
      u.consent?.at,
      u.createdAt,
    ]);
  }
}

export async function stats() {
  const [users, newLeads, interests, newEnquiries, byStatus, recent, top] = await Promise.all([
    User.countDocuments({ role: 'user', status: 'active' }),
    User.countDocuments({ role: 'user', status: 'active', leadStatus: 'new' }),
    Interest.countDocuments(),
    Enquiry.countDocuments({ status: 'new' }),
    Property.aggregate<{ _id: string; n: number }>([
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name leadStatus createdAt')
      .lean(),
    Interest.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $group: { _id: '$property', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 5 },
    ]),
  ]);
  const props = await Property.find({ _id: { $in: top.map((t) => t._id) } })
    .select('title slug')
    .lean();
  const pMap = new Map(props.map((p) => [String(p._id), p]));
  return {
    users,
    newLeads,
    interests,
    newEnquiries,
    properties: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
    recentLeads: recent.map((u) => ({
      id: String(u._id),
      name: u.name,
      leadStatus: u.leadStatus,
      createdAt: u.createdAt,
    })),
    topProperties: top.flatMap((t) => {
      const p = pMap.get(String(t._id));
      return p ? [{ id: String(p._id), title: p.title, slug: p.slug, interests: t.n }] : [];
    }),
  };
}
