import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes progress as a 0–100 progressbar with a name', () => {
    render(<ProgressBar value={0.4} label="Analysis progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Analysis progress' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '40');
  });

  it.each([
    [-0.5, '0'],
    [1.7, '100'],
    [Number.NaN, '0'],
    [0.333, '33'],
  ])('clamps and rounds %d to %s', (value, expected) => {
    render(<ProgressBar value={value} label="Progress" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', expected);
  });

  it('sizes the fill to the progress', () => {
    const { container } = render(<ProgressBar value={0.25} label="Progress" />);
    const fill = container.querySelector('[role="progressbar"] > div');
    expect(fill).toHaveStyle({ width: '25%' });
  });
});
