'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';
import { formatPrice, typeLabel } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { AdminProperty } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { PageHeader, Pager, State, Table, Td, Th } from '@/components/admin/parts';

const STATUSES = ['available', 'sold', 'rented', 'hidden'];

export default function ListingsAdmin() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { data, meta, loading, error, reload } = useApi<AdminProperty[]>('/admin/properties', {
    page,
    limit: 15,
    status,
    q: search,
  });

  async function patch(p: AdminProperty, body: Record<string, unknown>, ok: string) {
    try {
      await api(`/admin/properties/${p.id}`, { method: 'PATCH', body });
      toast.success(ok);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save.');
    }
  }

  return (
    <>
      <PageHeader
        title="Listings"
        actions={
          <LinkButton href="/admin/listings/new">
            <Plus size={18} aria-hidden /> New listing
          </LinkButton>
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
          aria-label="Search listings"
          placeholder="Search title, locality or city"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
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
        <button type="submit" className="min-h-11 rounded-md border border-forest px-5 text-forest">
          Search
        </button>
      </form>

      <State
        loading={loading}
        error={error}
        empty={data?.length === 0}
        emptyText="No listings match. Add your first listing."
        onRetry={reload}
      >
        <Table caption="Listings">
          <thead>
            <tr>
              <Th>Listing</Th>
              <Th>Price</Th>
              <Th>Status</Th>
              <Th>Featured</Th>
              <Th>Views</Th>
            </tr>
          </thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link
                    href={`/admin/listings/${p.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {p.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {typeLabel(p.type)}, {p.purpose === 'rent' ? 'rent' : 'sale'}, {p.address.city}
                  </p>
                </Td>
                <Td>{formatPrice(p.price, p.priceUnit)}</Td>
                <Td>
                  <Select
                    aria-label={`Status of ${p.title}`}
                    value={p.status}
                    onChange={(e) =>
                      patch(p, { status: e.target.value }, `Marked ${e.target.value}.`)
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </Td>
                <Td>
                  <label className="inline-flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-5 accent-[var(--forest)]"
                      checked={p.featured}
                      onChange={(e) =>
                        patch(
                          p,
                          { featured: e.target.checked },
                          e.target.checked ? 'Featured.' : 'Unfeatured.',
                        )
                      }
                    />
                    {p.featured ? (
                      <Badge tone="forest">Featured</Badge>
                    ) : (
                      <span className="text-muted">No</span>
                    )}
                  </label>
                </Td>
                <Td>{p.viewCount ?? 0}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pager meta={meta} onPage={setPage} />
      </State>
    </>
  );
}
