import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { selectView } from '../../../lib/selectView';
import { DEFAULT_VIEW_SETTINGS, type FrequencyResult } from '../../../lib/types';
import { expectAccessibleChart, expectWordTooltipInteractions } from '../../../test/charts';
import { ZipfChart } from './ZipfChart';

const entries: [string, number][] = Array.from({ length: 300 }, (_, i) => [
  `w${String(i + 1)}`,
  Math.max(1, Math.round(1000 / (i + 1))),
]);
const result: FrequencyResult = {
  bookName: 'zipf.txt',
  totalWords: entries.reduce((sum, [, count]) => sum + count, 0),
  distinctWords: entries.length,
  entries,
  isLikelyEnglish: true,
};
const view = selectView(result, DEFAULT_VIEW_SETTINGS);

const renderChart = () =>
  render(
    <MotionConfig reducedMotion="always">
      <ZipfChart
        entries={view.entries}
        points={view.zipfPoints}
        idealAt={view.idealAt}
        tableId="word-table"
      />
    </MotionConfig>,
  );

describe('ZipfChart', () => {
  it('draws log-scaled axes with power-of-ten ticks and axis labels', () => {
    const { container } = renderChart();
    const xTicks = [...container.querySelectorAll('[data-axis="x"] text')].map(
      (t) => t.textContent,
    );
    const yTicks = [...container.querySelectorAll('[data-axis="y"] text')].map(
      (t) => t.textContent,
    );
    // 300 ranks and a top count of 1,000, with padding: no empty decade on either axis.
    expect(xTicks).toEqual(['1', '10', '100']);
    expect(yTicks).toEqual(['1', '10', '100', '1,000']);
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('Frequency')).toBeInTheDocument();
  });

  it('draws one point per sampled rank and the ideal curve', () => {
    const { container } = renderChart();
    expect(container.querySelectorAll('[data-word-index]')).toHaveLength(view.zipfPoints.length);
    expect(container.querySelector('path[data-series="ideal"]')?.getAttribute('d')).toMatch(/^M/);
  });

  it('has a legend for the book and the ideal curve (US2-5)', () => {
    renderChart();
    expect(screen.getByText('Your book')).toBeInTheDocument();
    expect(screen.getByText('Ideal Zipf curve')).toBeInTheDocument();
  });

  it('gives each point a tap target of at least 24×24 px', () => {
    const { container } = renderChart();
    const hitArea = container.querySelector('[data-word-index="0"] [data-hit-area]');
    expect(Number(hitArea?.getAttribute('r'))).toBeGreaterThanOrEqual(12);
  });

  it('has an accessible title, description, and a "View as table" link', () => {
    const { container } = renderChart();
    expectAccessibleChart(container, 'word-table');
  });

  it('shows a tooltip on hover, focus, and tap (FR-015)', async () => {
    renderChart();
    const point = screen.getByRole('img', { name: 'Rank 2: w2, 500 times' });
    const entry = view.entries[1];
    if (!entry) throw new Error('missing entry');
    await expectWordTooltipInteractions(userEvent.setup(), point, entry);
  });
});
