'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { Select } from '@/components/ui/Field';
import { PageHeader, Pager, State, Table, Td, Th, fmtDate } from '@/components/admin/parts';

const STATUSES = ['new', 'contacted', 'closed'];

interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function EnquiriesAdmin() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, meta, loading, error, reload } = useApi<Enquiry[]>('/admin/enquiries', {
    page,
    limit: 15,
    status,
  });

  async function setEnquiryStatus(id: string, next: string) {
    try {
      await api(`/admin/enquiries/${id}`, { method: 'PATCH', body: { status: next } });
      toast.success('Updated.');
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save.');
    }
  }

  return (
    <>
      <PageHeader title="Enquiries" />
      <div className="mb-5 max-w-xs">
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>
      <State
        loading={loading}
        error={error}
        empty={data?.length === 0}
        emptyText="No enquiries yet."
        onRetry={reload}
      >
        <Table caption="Enquiries">
          <thead>
            <tr>
              <Th>From</Th>
              <Th>Message</Th>
              <Th>When</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {data?.map((e) => (
              <tr key={e.id}>
                <Td>
                  <span className="font-medium">{e.name}</span>
                  <br />
                  <a href={`tel:${e.phone}`} className="text-sm text-muted hover:underline">
                    {e.phone}
                  </a>
                  <br />
                  <a href={`mailto:${e.email}`} className="text-sm text-muted hover:underline">
                    {e.email}
                  </a>
                </Td>
                <Td className="max-w-[28rem] whitespace-pre-line break-words">{e.message}</Td>
                <Td>{fmtDate(e.createdAt)}</Td>
                <Td>
                  <Select
                    aria-label={`Status of enquiry from ${e.name}`}
                    value={e.status}
                    onChange={(ev) => setEnquiryStatus(e.id, ev.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pager meta={meta} onPage={setPage} />
      </State>
    </>
  );
}
