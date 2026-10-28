import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('is a group named by its label', () => {
    render(<StatCard label="Total words" value="—" />);
    expect(screen.getByRole('group', { name: 'Total words' })).toHaveTextContent('—');
  });

  it('counts up to the formatted final value', async () => {
    render(<StatCard label="Total words" value={12_345} />);
    expect(await screen.findByText('12,345', undefined, { timeout: 2000 })).toBeInTheDocument();
  });

  it('shows the final value immediately with reduced motion', () => {
    render(
      <MotionConfig reducedMotion="always">
        <StatCard label="Total words" value={12_345} />
      </MotionConfig>,
    );
    expect(screen.getByRole('group', { name: 'Total words' })).toHaveTextContent('12,345');
  });

  it('shows text values and an optional sub-label', () => {
    render(<StatCard label="Most frequent word" value="the" subLabel="23 times" tone="accent" />);
    const card = screen.getByRole('group', { name: 'Most frequent word' });
    expect(card).toHaveTextContent('the');
    expect(card).toHaveTextContent('23 times');
    expect(card).toHaveAttribute('data-tone', 'accent');
  });
});
