import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ERROR_MESSAGES } from '../../../lib/errorMessages';
import { UploadPanel } from './UploadPanel';

describe('UploadPanel', () => {
  it('shows the drop zone and the privacy note, focused on the drop zone', () => {
    render(<UploadPanel onFile={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Choose a book' })).toHaveFocus();
    expect(
      screen.getByText('Your book never leaves your device and is not saved'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('passes chosen files to onFile', async () => {
    const onFile = vi.fn();
    const { container } = render(<UploadPanel onFile={onFile} onRetry={vi.fn()} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    const book = new File(['words'], 'book.txt');
    if (input) await userEvent.upload(input, book);
    expect(onFile).toHaveBeenCalledWith(book);
  });

  it('shows the error and focuses the drop zone after retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<UploadPanel onFile={vi.fn()} errorCode="protected" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent(ERROR_MESSAGES.protected);
    await user.click(screen.getByRole('button', { name: 'Choose another book' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Choose a book' })).toHaveFocus();
  });
});
