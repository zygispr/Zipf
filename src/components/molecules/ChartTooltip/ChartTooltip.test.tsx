import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChartTooltip } from './ChartTooltip';

describe('ChartTooltip', () => {
  it('shows word, count, rank, and percent (FR-015)', () => {
    render(
      <ChartTooltip
        id="tip"
        entry={{ word: 'café', count: 1234, rank: 3, percent: 12.3456 }}
        position={{ x: 0, y: 0 }}
        onDismiss={vi.fn()}
      />,
    );
    const tooltip = screen.getByRole('tooltip');
    expect(screen.getByText('café').tagName).toBe('STRONG');
    expect(tooltip).toHaveTextContent('Count: 1,234');
    expect(tooltip).toHaveTextContent('Rank: #3');
    expect(tooltip).toHaveTextContent('12.35% of words');
  });

  it('renders nothing without an entry', () => {
    render(<ChartTooltip id="tip" entry={null} position={{ x: 0, y: 0 }} onDismiss={vi.fn()} />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
