import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DropOverlay } from './DropOverlay';

describe('DropOverlay', () => {
  it('shows the drop hint when visible, hidden from assistive technology', () => {
    render(<DropOverlay visible />);
    const hint = screen.getByText('Drop your book to analyze it');
    expect(hint.closest('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('renders nothing when not visible', () => {
    render(<DropOverlay visible={false} />);
    expect(screen.queryByText('Drop your book to analyze it')).not.toBeInTheDocument();
  });
});
