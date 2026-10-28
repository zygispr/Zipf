import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResultsToolbar, type ResultsToolbarProps } from './ResultsToolbar';

const renderToolbar = (props: Partial<ResultsToolbarProps> = {}) => {
  const all: ResultsToolbarProps = {
    visualization: 'bar',
    onVisualizationChange: vi.fn(),
    onNewBook: vi.fn(),
    ...props,
  };
  render(<ResultsToolbar {...all} />);
  return all;
};

describe('ResultsToolbar', () => {
  it('starts over with "New book" (FR-023)', async () => {
    const { onNewBook } = renderToolbar();
    await userEvent.click(screen.getByRole('button', { name: 'New book' }));
    expect(onNewBook).toHaveBeenCalledTimes(1);
  });

  it('switches between the three visualizations (FR-014)', async () => {
    const { onVisualizationChange } = renderToolbar({ visualization: 'cloud' });
    const group = screen.getByRole('radiogroup', { name: 'Visualization' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Word cloud' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(screen.getByRole('radio', { name: "Zipf's law" }));
    expect(onVisualizationChange).toHaveBeenCalledWith('zipf');
    await userEvent.click(screen.getByRole('radio', { name: 'Bar chart' }));
    expect(onVisualizationChange).toHaveBeenCalledWith('bar');
  });
});
