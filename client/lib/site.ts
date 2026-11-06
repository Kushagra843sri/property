/**
 * Site-wide constants. Everything marked PLACEHOLDER must be replaced with real client content
 * (tracked in ROADMAP.md "Content needed from client" and docs/MORNING-REVIEW.md).
 */

// PLACEHOLDER: brand name, logo and tagline are not supplied yet.
export const SITE = {
  name: 'Brand Name',
  tagline: 'Property advisors',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  // PLACEHOLDER: real contact details. These are obviously fake.
  phone: '+91 00000 00000',
  phoneHref: 'tel:+910000000000',
  whatsappNumber: '910000000000',
  email: 'hello@example.com',
  address: {
    line: 'PLACEHOLDER Street Name',
    locality: 'Locality',
    city: 'City',
    state: 'State',
    pincode: '000000',
  },
  // PLACEHOLDER: office hours
  hours: [
    { days: 'Monday to Saturday', time: '10:00 to 19:00' },
    { days: 'Sunday', time: 'By appointment' },
  ],
  // PLACEHOLDER: office coordinates used for the contact-page map
  geo: { lat: 26.8467, lng: 80.9462 },
  // PLACEHOLDER: dealer bio and photo for the About page
  dealer: { name: 'Dealer Name', bio: null as string | null },
} as const;

export const whatsappLink = (text = 'Hello, I would like to know more about your properties.') =>
  `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(text)}`;

export const NAV = [
  { href: '/listings', label: 'Properties' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;
