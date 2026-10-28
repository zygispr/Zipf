import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultsLayout } from './ResultsLayout';

const SLOTS = ['heading', 'stats', 'toolbar', 'visualization', 'search', 'table'] as const;

describe('ResultsLayout', () => {
  it('renders each slot in its own region', () => {
    const props = Object.fromEntries(
      SLOTS.map((slot) => [slot, <span key={slot}>{slot}-content</span>]),
    );
    const { container } = render(<ResultsLayout {...props} />);
    for (const slot of SLOTS) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).toHaveTextContent(`${slot}-content`);
    }
  });

  it('renders nothing for empty slots', () => {
    const { container } = render(<ResultsLayout heading={<h2>Book</h2>} />);
    expect(container.querySelector('[data-slot="heading"]')).toBeInTheDocument();
    for (const slot of SLOTS.slice(1)) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).not.toBeInTheDocument();
    }
  });
});
