import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Terms', alternates: { canonical: '/terms' } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="the date of publication (to be set)">
      <p>
        By using this website you agree to these terms. If you do not agree, please do not use the
        site.
      </p>

      <h2>Property information</h2>
      <p>
        Listings are provided in good faith, but details such as price, area and availability can
        change and may contain errors. Please confirm everything with us and inspect the property
        before making any decision. Nothing on this site is an offer that binds {SITE.name} until
        agreed in writing.
      </p>

      <h2>Your account</h2>
      <p>
        Keep your login codes private. You must give accurate details and may not use the site to
        send spam or false enquiries. We may suspend accounts that misuse the site.
      </p>

      <h2>Registering interest</h2>
      <p>
        Pressing &quot;I am interested&quot; shares your name, phone and email with {SITE.name} so
        we can contact you about that property. It is not a booking or a commitment to buy or rent.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent permitted by law, {SITE.name} is not liable for losses arising from reliance
        on the information on this site.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of India. The courts of [PLACEHOLDER: city] have
        jurisdiction.
      </p>

      <h2>Contact</h2>
      <p>{SITE.email}</p>
    </LegalPage>
  );
}
