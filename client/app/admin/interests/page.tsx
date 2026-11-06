'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useApi } from '@/lib/useApi';
import { PageHeader, Pager, State, Table, Td, Th, fmtDate } from '@/components/admin/parts';

interface Row {
  id: string;
  createdAt: string;
  notified: boolean;
  user?: { id: string; name: string; email: string; phone: string; status: string };
  property?: { id: string; title: string; slug: string };
}

export default function InterestsAdmin() {
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useApi<Row[]>('/admin/interests', {
    page,
    limit: 20,
  });
  return (
    <>
      <PageHeader title="Interests" />
      <State
        loading={loading}
        error={error}
        empty={data?.length === 0}
        emptyText="No one has shown interest yet."
        onRetry={reload}
      >
        <Table caption="Interests">
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Property</Th>
              <Th>When</Th>
              <Th>Dealer notified</Th>
            </tr>
          </thead>
          <tbody>
            {data?.map((r) => (
              <tr key={r.id}>
                <Td>
                  {r.user ? (
                    <>
                      <span className="font-medium">{r.user.name}</span>
                      <br />
                      <a
                        href={`tel:${r.user.phone}`}
                        className="text-sm text-muted hover:underline"
                      >
                        {r.user.phone}
                      </a>
                    </>
                  ) : (
                    <span className="text-muted">Deleted account</span>
                  )}
                </Td>
                <Td>
                  {r.property ? (
                    <Link
                      href={`/admin/listings/${r.property.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {r.property.title}
                    </Link>
                  ) : (
                    <span className="text-muted">Deleted listing</span>
                  )}
                </Td>
                <Td>{fmtDate(r.createdAt)}</Td>
                <Td>{r.notified ? 'Yes' : 'No, check email setup'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pager meta={meta} onPage={setPage} />
      </State>
    </>
  );
}
