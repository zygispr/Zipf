import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'motion/react';
import { describe, expect, it } from 'vitest';
import {
  CHART_ENTRIES,
  expectAccessibleChart,
  expectWordTooltipInteractions,
} from '../../../test/charts';
import { BarChart } from './BarChart';

const renderChart = () =>
  render(
    <MotionConfig reducedMotion="always">
      <BarChart entries={CHART_ENTRIES} tableId="word-table" />
    </MotionConfig>,
  );

const bars = () => screen.getAllByRole('img', { name: /times$/ });

describe('BarChart', () => {
  it('draws one bar per top word, labelled with word and count (FR-013)', () => {
    renderChart();
    expect(bars().map((bar) => bar.getAttribute('aria-label'))).toEqual([
      'the: 40 times',
      'cat: 20 times',
      'hat: 10 times',
    ]);
  });

  it('sizes bars in proportion to their counts', () => {
    renderChart();
    const [the, cat, hat] = bars().map((bar) =>
      // motion writes animated SVG widths with units, e.g. "120px".
      parseFloat(bar.querySelector('[data-bar]')?.getAttribute('width') ?? ''),
    );
    expect(the).toBeGreaterThan(0);
    expect((the ?? 0) / (cat ?? 1)).toBeCloseTo(2);
    expect((cat ?? 0) / (hat ?? 1)).toBeCloseTo(2);
  });

  it('has an accessible title, description, and a "View as table" link', () => {
    const { container } = renderChart();
    expectAccessibleChart(container, 'word-table');
  });

  it('shows a tooltip on hover, focus, and tap (FR-015)', async () => {
    renderChart();
    const [, cat] = bars();
    const entry = CHART_ENTRIES[1];
    if (!cat || !entry) throw new Error('missing bar');
    await expectWordTooltipInteractions(userEvent.setup(), cat, entry);
  });
});
