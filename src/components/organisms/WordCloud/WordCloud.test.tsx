import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'motion/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WordCloudLayoutState } from '../../../hooks/useWordCloudLayout';
import type { PlacedWord } from '../../../lib/wordCloudLayout';
import {
  CHART_ENTRIES,
  expectAccessibleChart,
  expectWordTooltipInteractions,
} from '../../../test/charts';
import { WordCloud } from './WordCloud';

// The layout the chart receives; each test sets it before rendering.
const layout = vi.hoisted((): { current: WordCloudLayoutState } => ({
  current: { words: null, failed: false },
}));

vi.mock('../../../hooks/useWordCloudLayout', () => ({
  useWordCloudLayout: () => layout.current,
}));

const PLACED: PlacedWord[] = CHART_ENTRIES.map((entry, i) => ({
  ...entry,
  x: i * 60 - 60,
  y: i * 20,
  size: 72 - i * 20,
  rotate: i === 2 ? 90 : 0,
}));

const renderCloud = () =>
  render(
    <MotionConfig reducedMotion="always">
      <WordCloud entries={CHART_ENTRIES} tableId="word-table" />
    </MotionConfig>,
  );

beforeEach(() => {
  layout.current = { words: PLACED, failed: false };
});

describe('WordCloud', () => {
  it('shows a spinner while the layout is computed', () => {
    layout.current = { words: null, failed: false };
    renderCloud();
    expect(screen.getByRole('status')).toHaveTextContent('Arranging words');
    expect(screen.queryAllByRole('img', { name: /times$/ })).toHaveLength(0);
  });

  it('shows one <text> per placed word', async () => {
    const { container } = renderCloud();
    expect(await screen.findAllByRole('img', { name: /times$/ })).toHaveLength(3);
    expect(container.querySelectorAll('text[data-word-index]')).toHaveLength(PLACED.length);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('draws larger words for higher counts', async () => {
    renderCloud();
    const [the, cat] = await screen.findAllByRole('img', { name: /times$/ });
    expect(Number(the?.getAttribute('font-size'))).toBeGreaterThan(
      Number(cat?.getAttribute('font-size')),
    );
  });

  it('has an accessible title, description, and a "View as table" link', async () => {
    const { container } = renderCloud();
    await screen.findAllByRole('img', { name: /times$/ });
    expectAccessibleChart(container, 'word-table');
  });

  it('shows a tooltip on hover, focus, and tap (FR-015)', async () => {
    renderCloud();
    const [the] = await screen.findAllByRole('img', { name: /times$/ });
    const entry = CHART_ENTRIES[0];
    if (!the || !entry) throw new Error('missing word');
    await expectWordTooltipInteractions(userEvent.setup(), the, entry);
  });

  it('explains when the cloud could not be drawn, pointing to the other views', () => {
    layout.current = { words: null, failed: true };
    const { container } = renderCloud();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      "The word cloud couldn't be drawn in this browser. The bar chart and the table show the same words.",
    );
    expectAccessibleChart(container, 'word-table');
  });
});
