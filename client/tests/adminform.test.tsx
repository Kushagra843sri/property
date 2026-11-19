import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const api = vi.fn();
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: (...a: unknown[]) => api(...a) };
});

import { PropertyForm } from '@/components/admin/PropertyForm';

describe('admin PropertyForm', () => {
  it('shows BHK only for flats and requires it', async () => {
    const u = userEvent.setup();
    render(<PropertyForm onSaved={() => undefined} />);
    expect(screen.getByLabelText(/^BHK/)).toBeInTheDocument(); // flat is the default type
    await u.selectOptions(screen.getByLabelText('Property type'), 'pg');
    expect(screen.queryByLabelText(/^BHK/)).toBeNull();
    await u.selectOptions(screen.getByLabelText('Property type'), 'flat');

    await u.type(screen.getByLabelText('Title'), 'A flat');
    await u.type(screen.getByLabelText(/Price in rupees/), '10000');
    await u.type(screen.getByLabelText('City'), 'X');
    await u.click(screen.getByRole('button', { name: 'Create listing' }));
    expect(await screen.findByText('Choose the BHK')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('omits BHK from the request for non-flat types', async () => {
    api.mockResolvedValue({ data: { id: '1' } });
    const u = userEvent.setup();
    render(<PropertyForm onSaved={() => undefined} />);
    await u.selectOptions(screen.getByLabelText('Property type'), 'room');
    await u.type(screen.getByLabelText('Title'), 'Room');
    await u.type(screen.getByLabelText(/Price in rupees/), '8000');
    await u.type(screen.getByLabelText('City'), 'X');
    await u.click(screen.getByRole('button', { name: 'Create listing' }));
    const body = api.mock.calls[0]![1].body;
    expect(body).toMatchObject({ type: 'room', price: 8000, address: { city: 'X' } });
    expect(body).not.toHaveProperty('bhk');
  });
});
