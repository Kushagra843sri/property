'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/parts';
import { PropertyForm } from '@/components/admin/PropertyForm';

export default function NewListing() {
  const router = useRouter();
  return (
    <>
      <PageHeader title="New listing" />
      <PropertyForm
        onSaved={(p) => {
          toast.success('Listing created. Now add photos.');
          router.push(`/admin/listings/${p.id}`);
        }}
      />
    </>
  );
}
