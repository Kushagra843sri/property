'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, API_URL, api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { PageHeader, Pager, State, Table, Td, Th, fmtDate } from '@/components/admin/parts';

const LEAD_STATUSES = ['new', 'contacted', 'interested', 'closed'];

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  leadStatus: string;
  consentGiven: boolean;
  createdAt: string;
  interestCount: number;
  adminNotes: { text: string; at: string }[];
}

function LeadRow({ lead, onChanged }: { lead: Lead; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>, ok: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/admin/users/${lead.id}`, { method: 'PATCH', body });
      toast.success(ok);
      onChanged();
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    if (await patch({ note: note.trim() }, 'Note added.')) setNote('');
  }

  return (
    <>
      <tr>
        <Td>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="font-medium underline-offset-4 hover:underline"
          >
            {lead.name}
          </button>
          {lead.status === 'withdrawn' && (
            <span className="ml-2">
              <Badge tone="warn">Withdrew consent</Badge>
            </span>
          )}
        </Td>
        <Td>
          <a href={`tel:${lead.phone}`} className="hover:underline">
            {lead.phone}
          </a>
          <br />
          <a href={`mailto:${lead.email}`} className="text-sm text-muted hover:underline">
            {lead.email}
          </a>
        </Td>
        <Td>
          <Select
            aria-label={`Lead status of ${lead.name}`}
            value={lead.leadStatus}
            onChange={(e) => patch({ leadStatus: e.target.value }, 'Status updated.')}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Td>
        <Td>{lead.interestCount}</Td>
        <Td>{fmtDate(lead.createdAt)}</Td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="border-b border-line bg-paper px-4 py-4">
            <h3 className="text-lg">Notes</h3>
            {lead.adminNotes.length === 0 ? (
              <p className="mt-1 text-muted">No notes yet.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {lead.adminNotes.map((n, i) => (
                  <li key={i} className="rounded-md bg-raised px-3 py-2">
                    <p className="whitespace-pre-line">{n.text}</p>
                    <p className="text-sm text-muted">{fmtDate(n.at)}</p>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={addNote} className="mt-3 flex flex-col gap-2 sm:max-w-xl">
              <Textarea
                aria-label={`New note for ${lead.name}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                placeholder="Add a note, for example: called, wants a 2 BHK on rent"
              />
              <Button type="submit" loading={busy} disabled={!note.trim()} className="self-start">
                Add note
              </Button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

function Leads() {
  const params = useSearchParams();
  const [page, setPage] = useState(1);
  const [leadStatus, setLeadStatus] = useState(params.get('leadStatus') ?? '');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { data, meta, loading, error, reload } = useApi<Lead[]>('/admin/users', {
    page,
    limit: 15,
    leadStatus,
    q: search,
  });

  return (
    <>
      <PageHeader
        title="Leads"
        actions={
          <a href={`${API_URL}/admin/export/leads.csv`} className={buttonClass('secondary')}>
            <Download size={18} aria-hidden /> Export CSV
          </a>
        }
      />
      <form
        role="search"
        className="mb-5 grid gap-3 sm:grid-cols-[1fr_12rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q.trim());
        }}
      >
        <Input
          aria-label="Search leads"
          placeholder="Search name, email or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          aria-label="Filter by lead status"
          value={leadStatus}
          onChange={(e) => {
            setPage(1);
            setLeadStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <button type="submit" className="min-h-11 rounded-md border border-forest px-5 text-forest">
          Search
        </button>
      </form>
      <State
        loading={loading}
        error={error}
        empty={data?.length === 0}
        emptyText="No leads match."
        onRetry={reload}
      >
        <Table caption="Leads">
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Contact</Th>
              <Th>Status</Th>
              <Th>Interests</Th>
              <Th>Signed up</Th>
            </tr>
          </thead>
          <tbody>
            {data?.map((l) => (
              <LeadRow key={l.id} lead={l} onChanged={reload} />
            ))}
          </tbody>
        </Table>
        <Pager meta={meta} onPage={setPage} />
      </State>
    </>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="skeleton h-40" />}>
      <Leads />
    </Suspense>
  );
}
