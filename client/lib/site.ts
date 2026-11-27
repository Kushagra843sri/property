/**
 * Site-wide constants. Everything marked PLACEHOLDER must be replaced with real client content
 * (tracked in ROADMAP.md "Content needed from client" and docs/MORNING-REVIEW.md).
 * Phone numbers and the business name live ONLY here; never hardcode them elsewhere.
 */

// Spelling confirmed by the client: "Shree Shyam Properties" (the shop sign reads "Shri Shyam").
export const BUSINESS_NAME = 'Shree Shyam Properties';

// Both numbers confirmed on WhatsApp by the owner. The first is shown as the main number:
// 8368966790 is the business line, 9238306976 is the owner's personal number.
const PHONE_DIGITS = ['8368966790', '9238306976'] as const;
const WHATSAPP_DIGITS: string = PHONE_DIGITS[0]; // the business line

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
  email: 'shyamshree1233@gmail.com',
  mapUrl: 'https://goo.gl/maps/UQ1mAEAHvRVKA77u9?g_st=aw', // the street address is not supplied yet
  hours: [{ days: 'Every day', time: '9:00 am to 9:00 pm' }],
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

/**
 * WhatsApp links can only prefill text, not attach a photo. The listing URL in the message makes
 * WhatsApp show a preview card with the listing's photo and title (from the page's Open Graph tags).
 */
export const listingWhatsappLink = (p: { title: string; slug: string }) =>
  whatsappLink(`Need details regarding it.\n${p.title}\n${SITE.url}/listings/${p.slug}`);

export const NAV = [
  { href: '/listings', label: 'Properties' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;
