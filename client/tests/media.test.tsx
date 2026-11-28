import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaPickerDialog } from '@/components/admin/MediaPickerDialog';
import { checkFiles } from '@/lib/media';

const file = (name: string, type: string, bytes = 1000) =>
  new File([new Uint8Array(bytes)], name, { type });

// jsdom has no native modal <dialog> and no object URLs.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

const setup = () => userEvent.setup({ applyAccept: false });
const open = (props: Partial<React.ComponentProps<typeof MediaPickerDialog>> = {}) => {
  const onPick = vi.fn();
  render(
    <MediaPickerDialog open kind="photo" onClose={() => undefined} onPick={onPick} {...props} />,
  );
  return onPick;
};
const input = () => screen.getByLabelText(/from your computer/i) as HTMLInputElement;

describe('checkFiles', () => {
  it('accepts the right types and sizes and explains what it refused', () => {
    const r = checkFiles('photo', [
      file('a.jpg', 'image/jpeg'),
      file('b.pdf', 'application/pdf'),
      file('big.png', 'image/png', 6 * 1024 * 1024),
    ]);
    expect(r.ok.map((f) => f.name)).toEqual(['a.jpg']);
    expect(r.problem).toContain('b.pdf is not JPG, PNG or WebP');
    expect(r.problem).toContain('big.png is larger than 5 MB');
  });
  it('allows video types only for videos', () => {
    expect(checkFiles('video', [file('v.mp4', 'video/mp4')]).ok).toHaveLength(1);
    expect(checkFiles('video', [file('p.jpg', 'image/jpeg')]).ok).toHaveLength(0);
  });
});

describe('photo picker dialog', () => {
  it('lists the chosen photos and hands them over on confirm', async () => {
    const u = setup();
    const onPick = open();
    expect(screen.getByRole('button', { name: /^Add 0 photos/ })).toBeDisabled();
    await u.upload(input(), [file('one.jpg', 'image/jpeg'), file('two.png', 'image/png')]);
    expect(screen.getByText('one.jpg')).toBeInTheDocument();
    expect(screen.getByText('two.png')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Add 2 photos' }));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0]![0]).toHaveLength(2);
  });

  it('refuses a file of the wrong type and says why', async () => {
    const u = setup();
    open();
    await u.upload(input(), file('notes.pdf', 'application/pdf'));
    expect(await screen.findByRole('alert')).toHaveTextContent('notes.pdf is not JPG, PNG or WebP');
    expect(screen.queryByRole('list', { name: 'Chosen files' })).toBeNull();
  });

  it('lets a photo be removed again before confirming', async () => {
    const u = setup();
    open();
    await u.upload(input(), [file('one.jpg', 'image/jpeg'), file('two.jpg', 'image/jpeg')]);
    await u.click(screen.getByRole('button', { name: 'Remove one.jpg' }));
    expect(screen.queryByText('one.jpg')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add 1 photo' })).toBeEnabled();
  });

  it('keeps within the room left on the listing', async () => {
    const u = setup();
    open({ maxFiles: 1 });
    await u.upload(input(), [file('one.jpg', 'image/jpeg'), file('two.jpg', 'image/jpeg')]);
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(screen.getByRole('alert')).toHaveTextContent('Only 1 more photo');
  });
});

describe('video picker dialog', () => {
  it('takes one video at a time and shows upload progress', async () => {
    const u = setup();
    const onPick = open({ kind: 'video' });
    await u.upload(input(), file('first.mp4', 'video/mp4'));
    await u.upload(input(), file('second.mov', 'video/quicktime'));
    expect(screen.queryByText('first.mp4')).toBeNull();
    expect(screen.getByText('second.mov')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Upload video' }));
    expect(onPick.mock.calls[0]![0][0].name).toBe('second.mov');
  });

  it('shows the percentage while uploading', () => {
    open({ kind: 'video', busy: true, progress: 42 });
    expect(screen.getByText(/Uploading… 42%/)).toBeInTheDocument();
  });
});
