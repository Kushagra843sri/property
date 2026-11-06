'use client';

import Link from 'next/link';
import { Download } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { buttonClass } from '@/components/ui/Button';
import { PageHeader, State, fmtDate } from '@/components/admin/parts';

interface Stats {
  users: number;
  newLeads: number;
  interests: number;
  newEnquiries: number;
  properties: Record<string, number>;
  recentLeads: { id: string; name: string; leadStatus: string; createdAt: string }[];
  topProperties: { id: string; title: string; slug: string; interests: number }[];
}

const Card = ({ label, value, href }: { label: string; value: number; href: string }) => (
  <Link
    href={href}
    className="rounded-lg border border-line bg-raised p-5 transition-colors duration-150 hover:border-forest"
  >
    <p className="text-muted">{label}</p>
    <p className="mt-1 font-display text-[2.5rem] leading-none">{value}</p>
  </Link>
);

export default function Dashboard() {
  const { data, loading, error, reload } = useApi<Stats>('/admin/stats');
  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <a href={`${API_URL}/admin/export/leads.csv`} className={buttonClass('secondary')}>
            <Download size={18} aria-hidden /> Export leads (CSV)
          </a>
        }
      />
      <State
        loading={loading}
        error={error}
        empty={!data}
        emptyText="No data yet."
        onRetry={reload}
      >
        {data && (
          <div className="flex flex-col gap-10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card label="People who signed up" value={data.users} href="/admin/leads" />
              <Card label="New leads" value={data.newLeads} href="/admin/leads?leadStatus=new" />
              <Card label="Interests registered" value={data.interests} href="/admin/interests" />
              <Card label="New enquiries" value={data.newEnquiries} href="/admin/enquiries" />
            </div>

            <div className="grid gap-10 lg:grid-cols-2">
              <section aria-labelledby="recent">
                <h2 id="recent" className="mb-3 text-xl">
                  Recent sign-ups
                </h2>
                {data.recentLeads.length === 0 ? (
                  <p className="text-muted">No one has signed up yet.</p>
                ) : (
                  <ul className="divide-y divide-line rounded-lg border border-line bg-raised">
                    {data.recentLeads.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <span>{l.name}</span>
                        <span className="text-sm text-muted">
                          {l.leadStatus}, {fmtDate(l.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="top">
                <h2 id="top" className="mb-3 text-xl">
                  Most interest
                </h2>
                {data.topProperties.length === 0 ? (
                  <p className="text-muted">No interests yet.</p>
                ) : (
                  <ul className="divide-y divide-line rounded-lg border border-line bg-raised">
                    {data.topProperties.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <Link
                          href={`/admin/listings/${p.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {p.title}
                        </Link>
                        <span className="text-sm text-muted">{p.interests}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section aria-labelledby="props">
              <h2 id="props" className="mb-3 text-xl">
                Listings by status
              </h2>
              <p className="text-muted">
                {Object.entries(data.properties)
                  .map(([k, v]) => `${v} ${k}`)
                  .join(', ') || 'No listings yet.'}
              </p>
            </section>
          </div>
        )}
      </State>
    </>
  );
}
