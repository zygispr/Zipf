import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileDropZone } from './FileDropZone';

const book = new File(['some words'], 'book.txt', { type: 'text/plain' });
const fileDrag = (files: File[] = []) => ({ dataTransfer: { files, types: ['Files'] } });

function setup() {
  const onFile = vi.fn();
  const view = render(<FileDropZone onFile={onFile} />);
  const zone = screen.getByRole('group', { name: 'Drop a book here' });
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('missing file input');
  return { onFile, zone, input };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FileDropZone', () => {
  it('offers a file picker limited to .txt and .epub', () => {
    const { input } = setup();
    expect(input).toHaveAttribute('accept', '.txt,.epub');
    expect(screen.getByRole('button', { name: 'Choose a book' })).toBeInTheDocument();
  });

  it('calls onFile with the file chosen in the picker', async () => {
    const { onFile, input } = setup();
    await userEvent.upload(input, book);
    expect(onFile).toHaveBeenCalledWith(book);
  });

  it('opens the picker when the button is clicked', async () => {
    const { input } = setup();
    const click = vi.spyOn(input, 'click');
    await userEvent.click(screen.getByRole('button', { name: 'Choose a book' }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it.each(['{Enter}', ' '])('opens the picker from the keyboard (%s)', async (key) => {
    const user = userEvent.setup();
    const { input } = setup();
    const click = vi.spyOn(input, 'click');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Choose a book' })).toHaveFocus();
    await user.keyboard(key);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('calls onFile with the first dropped file and stops the drop from reaching the page', () => {
    const { onFile, zone } = setup();
    const pageDrop = vi.fn();
    window.addEventListener('drop', pageDrop);
    fireEvent.drop(zone, fileDrag([book, new File(['x'], 'second.txt')]));
    window.removeEventListener('drop', pageDrop);
    expect(onFile).toHaveBeenCalledExactlyOnceWith(book);
    expect(pageDrop).not.toHaveBeenCalled();
  });

  it('highlights while a file is dragged over it', () => {
    const { zone } = setup();
    expect(zone).toHaveAttribute('data-dragging', 'false');
    fireEvent.dragEnter(zone, fileDrag());
    fireEvent.dragOver(zone, fileDrag());
    expect(zone).toHaveAttribute('data-dragging', 'true');
    fireEvent.dragLeave(zone, fileDrag());
    expect(zone).toHaveAttribute('data-dragging', 'false');
  });

  it('ignores drags that carry no files', () => {
    const { zone } = setup();
    fireEvent.dragEnter(zone, { dataTransfer: { files: [], types: ['text/plain'] } });
    expect(zone).toHaveAttribute('data-dragging', 'false');
  });

  it('exposes a ref for moving focus to it', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<FileDropZone onFile={vi.fn()} ref={ref} />);
    ref.current?.focus();
    expect(screen.getByRole('button', { name: 'Choose a book' })).toHaveFocus();
  });
});
