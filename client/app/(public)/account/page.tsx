import type { Metadata } from 'next';
import { AccountView } from '@/components/account/AccountView';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: false } };

export default function AccountPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="mb-10 text-[length:var(--text-3xl)]">My account</h1>
      <AccountView />
    </div>
  );
}
