import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { SummaryStats } from './SummaryStats';

const renderStats = (topEntry?: [string, number]) =>
  render(
    <MotionConfig reducedMotion="always">
      <SummaryStats totalWords={12_345} distinctWords={2_345} topEntry={topEntry} />
    </MotionConfig>,
  );

describe('SummaryStats', () => {
  it('shows total, distinct, and the most frequent word (FR-011)', () => {
    renderStats(['the', 1_024]);
    expect(screen.getByRole('group', { name: 'Total words' })).toHaveTextContent('12,345');
    expect(screen.getByRole('group', { name: 'Distinct words' })).toHaveTextContent('2,345');
    const top = screen.getByRole('group', { name: 'Most frequent word' });
    expect(top).toHaveTextContent('the');
    expect(top).toHaveTextContent('1,024 times');
  });

  it('uses the singular for a word seen once', () => {
    renderStats(['solo', 1]);
    expect(screen.getByRole('group', { name: 'Most frequent word' })).toHaveTextContent('1 time');
  });
});
