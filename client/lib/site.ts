/**
 * Site-wide constants. Everything marked PLACEHOLDER must be replaced with real client content
 * (tracked in ROADMAP.md "Content needed from client" and docs/MORNING-REVIEW.md).
 * Phone numbers and the business name live ONLY here; never hardcode them elsewhere.
 */

// UNCONFIRMED SPELLING: the client calls the business "Shree Shyam Properties" but the shop sign
// reads "Shri Shyam". Change it here and it updates everywhere.
export const BUSINESS_NAME = 'Shree Shyam Properties';

// PLACEHOLDER / UNVERIFIED: digits are partly hidden on the sign photo. Confirm both numbers and
// which one is on WhatsApp before launch. The first entry is treated as the main number.
const PHONE_DIGITS = ['9238306976', '8368966790'] as const;
const WHATSAPP_DIGITS: string = PHONE_DIGITS[0]; // PLACEHOLDER: which number takes WhatsApp is unknown

const phoneEntry = (d: string) => ({
  display: `+91 ${d.slice(0, 5)} ${d.slice(5)}`,
  href: `tel:+91${d}`,
});

export const SITE = {
  name: BUSINESS_NAME,
  tagline: 'Sale, purchase and renting',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  phones: PHONE_DIGITS.map(phoneEntry),
  phone: phoneEntry(PHONE_DIGITS[0]).display,
  phoneHref: phoneEntry(PHONE_DIGITS[0]).href,
  whatsappNumber: `91${WHATSAPP_DIGITS}`,
  // PLACEHOLDER: email, address, hours and coordinates are not supplied yet.
  email: 'hello@example.com',
  address: {
    line: 'PLACEHOLDER Street Name',
    locality: 'Locality',
    city: 'City',
    state: 'State',
    pincode: '000000',
  },
  hours: [
    { days: 'Monday to Saturday', time: '10:00 to 19:00' },
    { days: 'Sunday', time: 'By appointment' },
  ],
  geo: { lat: 26.8467, lng: 80.9462 },
  // PLACEHOLDER: dealer bio and photo for the About page
  dealer: { name: 'Dealer Name', bio: null as string | null },
} as const;

export const SERVICES = [
  { title: 'Sale', text: 'Selling a flat, shop or office? We list it and bring serious buyers.' },
  { title: 'Purchase', text: 'Looking to buy? We shortlist properties that fit your budget.' },
  { title: 'Renting', text: 'Flats, shops, offices, PG and furnished rooms on rent.' },
] as const;

export const whatsappLink = (text = 'Hello, I would like to know more about your properties.') =>
  `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(text)}`;

export const NAV = [
  { href: '/listings', label: 'Properties' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;
