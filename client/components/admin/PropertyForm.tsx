'use client';

import { useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';
import { typeLabel } from '@/lib/format';
import type { AdminProperty } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';

const TYPES = [
  'flat',
  'shop',
  'office',
  'pg',
  'room',
  'villa',
  'house',
  'plot',
  'commercial',
  'other',
];
const STATUSES = ['available', 'sold', 'rented', 'hidden'];
const FURNISHINGS = ['unfurnished', 'semi-furnished', 'furnished'];

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  if (s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
const str = (v: FormDataEntryValue | null) => String(v ?? '').trim() || undefined;

export function PropertyForm({
  initial,
  onSaved,
}: {
  initial?: AdminProperty;
  onSaved: (p: AdminProperty) => void;
}) {
  const [type, setType] = useState(initial?.type ?? 'flat');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const isFlat = type === 'flat';

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    const title = str(fd.get('title'));
    const price = num(fd.get('price'));
    const city = str(fd.get('city'));
    const bhk = num(fd.get('bhk'));
    if (!title) next.title = 'Enter a title';
    if (price !== undefined && price < 0) next.price = 'Price cannot be negative';
    if (!city) next.city = 'Enter the city';
    if (isFlat && bhk === undefined) next.bhk = 'Choose the BHK';
    if (Object.keys(next).length)
      return (setErrors(next), setFormError('Please fix the highlighted fields.'));

    const lat = num(fd.get('lat'));
    const lng = num(fd.get('lng'));
    const amenities = String(fd.get('amenities') ?? '')
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    const clean = <T extends Record<string, unknown>>(o: T) =>
      Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

    const body = clean({
      title,
      type,
      purpose: str(fd.get('purpose')),
      price: price ?? null, // empty clears the price, so the listing shows none
      priceUnit: str(fd.get('priceUnit')),
      description: String(fd.get('description') ?? '').trim(),
      status: str(fd.get('status')),
      featured: fd.get('featured') === 'on',
      bhk: isFlat ? bhk : undefined, // BHK exists for flats only
      bathrooms: num(fd.get('bathrooms')),
      carpetArea: num(fd.get('carpetArea')),
      builtUpArea: num(fd.get('builtUpArea')),
      areaUnit: str(fd.get('areaUnit')),
      furnishing: str(fd.get('furnishing')),
      floor: num(fd.get('floor')),
      totalFloors: num(fd.get('totalFloors')),
      facing: str(fd.get('facing')),
      possession: str(fd.get('possession')),
      amenities,
      address: clean({
        city,
        locality: str(fd.get('locality')),
        state: str(fd.get('state')),
        pincode: str(fd.get('pincode')),
        line: str(fd.get('line')),
      }),
      ...(lat !== undefined && lng !== undefined ? { geo: { lat, lng } } : {}),
    });

    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      const res = initial
        ? await api<AdminProperty>(`/admin/properties/${initial.id}`, { method: 'PATCH', body })
        : await api<AdminProperty>('/admin/properties', { method: 'POST', body });
      onSaved(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        const fe: Record<string, string> = {};
        for (const d of err.details ?? []) fe[d.path.split('.').pop() ?? '_'] ??= d.message;
        setErrors(fe);
        setFormError(err.details?.length ? 'Please fix the highlighted fields.' : err.message);
      } else setFormError('Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const d = initial;
  return (
    <form onSubmit={submit} noValidate className="flex max-w-4xl flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title" error={errors.title}>
            {(a) => <Input {...a} name="title" defaultValue={d?.title} maxLength={140} />}
          </Field>
        </div>
        <Field label="Property type" error={errors.type}>
          {(a) => (
            <Select {...a} name="type" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="For" error={errors.purpose}>
          {(a) => (
            <Select {...a} name="purpose" defaultValue={d?.purpose ?? 'rent'}>
              <option value="rent">Rent</option>
              <option value="buy">Sale</option>
            </Select>
          )}
        </Field>
        {isFlat && (
          <Field label="BHK" error={errors.bhk} hint="Flats only">
            {(a) => (
              <Select {...a} name="bhk" defaultValue={d?.bhk ?? ''}>
                <option value="">Choose</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field
          label="Price in rupees (optional)"
          error={errors.price}
          hint="Leave empty to show no price"
        >
          {(a) => (
            <Input
              {...a}
              name="price"
              type="number"
              min={0}
              step="any"
              defaultValue={d?.price ?? undefined}
              inputMode="numeric"
            />
          )}
        </Field>
        <Field label="Price is">
          {(a) => (
            <Select {...a} name="priceUnit" defaultValue={d?.priceUnit ?? 'total'}>
              <option value="total">Total price</option>
              <option value="per-month">Per month (rent)</option>
            </Select>
          )}
        </Field>
        <Field label="Status">
          {(a) => (
            <Select {...a} name="status" defaultValue={d?.status ?? 'available'}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          )}
        </Field>
        <label className="flex min-h-11 items-center gap-3 self-end">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={d?.featured}
            className="size-5 accent-[var(--forest)]"
          />
          Show as featured on the home page
        </label>
      </div>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-2 text-xl">Location</legend>
        <Field label="City" error={errors.city}>
          {(a) => <Input {...a} name="city" defaultValue={d?.address.city} />}
        </Field>
        <Field label="Locality / area">
          {(a) => <Input {...a} name="locality" defaultValue={d?.address.locality} />}
        </Field>
        <Field label="Address line">
          {(a) => <Input {...a} name="line" defaultValue={d?.address.line} />}
        </Field>
        <Field label="State">
          {(a) => <Input {...a} name="state" defaultValue={d?.address.state} />}
        </Field>
        <Field label="Pincode">
          {(a) => (
            <Input {...a} name="pincode" defaultValue={d?.address.pincode} inputMode="numeric" />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude (map)">
            {(a) => <Input {...a} name="lat" type="number" step="any" defaultValue={d?.geo?.lat} />}
          </Field>
          <Field label="Longitude (map)">
            {(a) => <Input {...a} name="lng" type="number" step="any" defaultValue={d?.geo?.lng} />}
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-3">
        <legend className="mb-2 text-xl">Details</legend>
        <Field label="Bathrooms">
          {(a) => (
            <Input {...a} name="bathrooms" type="number" min={0} defaultValue={d?.bathrooms} />
          )}
        </Field>
        <Field label="Carpet area">
          {(a) => (
            <Input
              {...a}
              name="carpetArea"
              type="number"
              min={0}
              step="any"
              defaultValue={d?.carpetArea}
            />
          )}
        </Field>
        <Field label="Built-up area">
          {(a) => (
            <Input
              {...a}
              name="builtUpArea"
              type="number"
              min={0}
              step="any"
              defaultValue={d?.builtUpArea}
            />
          )}
        </Field>
        <Field label="Area unit">
          {(a) => (
            <Select {...a} name="areaUnit" defaultValue={d?.areaUnit ?? 'sqft'}>
              <option value="sqft">sq.ft</option>
              <option value="sqyd">sq.yd</option>
              <option value="sqm">sq.m</option>
              <option value="acre">acre</option>
            </Select>
          )}
        </Field>
        <Field label="Furnishing">
          {(a) => (
            <Select {...a} name="furnishing" defaultValue={d?.furnishing ?? ''}>
              <option value="">Not specified</option>
              {FURNISHINGS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Floor">
          {(a) => <Input {...a} name="floor" type="number" defaultValue={d?.floor} />}
        </Field>
        <Field label="Total floors">
          {(a) => (
            <Input {...a} name="totalFloors" type="number" min={0} defaultValue={d?.totalFloors} />
          )}
        </Field>
        <Field label="Facing">
          {(a) => <Input {...a} name="facing" defaultValue={d?.facing} />}
        </Field>
        <Field label="Possession">
          {(a) => <Input {...a} name="possession" defaultValue={d?.possession} />}
        </Field>
      </fieldset>

      <Field
        label="Amenities"
        hint="Separate with commas, for example: Parking, Lift, Power backup"
      >
        {(a) => <Input {...a} name="amenities" defaultValue={d?.amenities.join(', ')} />}
      </Field>
      <Field label="Description">
        {(a) => (
          <Textarea
            {...a}
            name="description"
            defaultValue={d?.description}
            maxLength={5000}
            className="min-h-40"
          />
        )}
      </Field>

      {formError && (
        <p role="alert" className="rounded-md bg-error-bg px-3 py-2 text-error">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" loading={busy} className="self-start">
        {initial ? 'Save changes' : 'Create listing'}
      </Button>
    </form>
  );
}
