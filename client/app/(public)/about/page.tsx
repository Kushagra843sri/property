import type { Metadata } from 'next';
import { LinkButton } from '@/components/ui/Button';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description: `About ${SITE.name}.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-[length:var(--text-3xl)]">About us</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {/* PLACEHOLDER: replace with the dealer's real story, experience and areas served. */}
          <p className="max-w-[var(--measure)] text-lg">
            {SITE.dealer.bio ??
              `${SITE.name} shows a hand-picked set of properties and answers every enquiry personally. A fuller story about the dealer, their experience and the areas they cover will appear here.`}
          </p>
          <p className="mt-4 max-w-[var(--measure)] text-muted">
            Placeholder text: the dealer&apos;s own words and photograph are still to be added.
          </p>
          <LinkButton href="/contact" size="lg" className="mt-8">
            Get in touch
          </LinkButton>
        </div>
        <div className="lg:col-span-5">
          {/* PLACEHOLDER: dealer photograph */}
          <div
            role="img"
            aria-label="Placeholder for the dealer's photograph"
            className="grid aspect-[4/5] place-items-center rounded-lg bg-sunken text-muted"
          >
            Dealer photo to come
          </div>
        </div>
      </div>
    </div>
  );
}
