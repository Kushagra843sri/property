import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="the date of publication (to be set)">
      <p>
        This policy explains what personal information {SITE.name} collects through this website,
        why, and the choices you have. We follow the principles of India&apos;s Digital Personal
        Data Protection Act, 2023.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          When you create an account: your name, email address and phone number, and a record of
          your consent.
        </li>
        <li>When you tell us you are interested in a property: which property and when.</li>
        <li>When you send an enquiry: your name, email, phone and message.</li>
        <li>
          Technical data needed to keep the site secure, such as your IP address in server logs.
        </li>
      </ul>

      <h2>Why we use it</h2>
      <p>
        To verify your account, to contact you about the properties you are interested in, to answer
        your enquiries, and to tell you about other properties we think may suit you. We do not sell
        your information.
      </p>

      <h2>Your consent</h2>
      <p>
        You agree to be contacted when you sign up, using a box that is never pre-ticked. You can
        withdraw that consent at any time from <strong>My account</strong>, after which we will stop
        contacting you about properties.
      </p>

      <h2>Deleting your data</h2>
      <p>
        You can delete your account from <strong>My account</strong>. This removes your profile and
        your recorded interests. You can also write to us at {SITE.email}.
      </p>

      <h2>Who sees your information</h2>
      <p>
        Only {SITE.name} and the service providers that help us run the site, such as email and SMS
        delivery and hosting. They may use it only to provide those services.
      </p>

      <h2>How we protect it</h2>
      <p>
        Connections are encrypted, one-time codes and session tokens are stored securely, and access
        to the admin area is restricted and logged.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests: {SITE.email}, {SITE.phone}.
      </p>
    </LegalPage>
  );
}
