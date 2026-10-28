import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResultsToolbar } from './ResultsToolbar';

describe('ResultsToolbar', () => {
  it('starts over with "New book" (FR-023)', async () => {
    const onNewBook = vi.fn();
    render(<ResultsToolbar onNewBook={onNewBook} />);
    await userEvent.click(screen.getByRole('button', { name: 'New book' }));
    expect(onNewBook).toHaveBeenCalledTimes(1);
  });
});
