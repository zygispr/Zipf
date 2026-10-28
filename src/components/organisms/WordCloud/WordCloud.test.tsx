import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'motion/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlacedWord } from '../../../lib/wordCloudLayout';
import {
  CHART_ENTRIES,
  expectAccessibleChart,
  expectWordTooltipInteractions,
} from '../../../test/charts';
import { WordCloud } from './WordCloud';

// Each render's layout stays pending until the test calls `layout.resolve`.
const layout = vi.hoisted(() => ({
  resolve: (words: PlacedWord[]): void => {
    throw new Error(`no layout requested yet (${String(words.length)} words)`);
  },
  cancel: vi.fn(),
}));

vi.mock('../../../lib/wordCloudLayout', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/wordCloudLayout')>()),
  computeWordCloudLayout: vi.fn(() => ({
    layout: new Promise<PlacedWord[]>((resolve) => {
      layout.resolve = resolve;
    }),
    cancel: layout.cancel,
  })),
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
  layout.cancel.mockClear();
});

describe('WordCloud', () => {
  it('shows a spinner while the layout is computed, then one <text> per placed word', async () => {
    const { container } = renderCloud();
    expect(screen.getByRole('status')).toHaveTextContent('Arranging words');
    layout.resolve(PLACED);
    expect(await screen.findAllByRole('img', { name: /times$/ })).toHaveLength(3);
    expect(container.querySelectorAll('text[data-word-index]')).toHaveLength(PLACED.length);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('draws larger words for higher counts', async () => {
    renderCloud();
    layout.resolve(PLACED);
    const [the, cat] = await screen.findAllByRole('img', { name: /times$/ });
    expect(Number(the?.getAttribute('font-size'))).toBeGreaterThan(
      Number(cat?.getAttribute('font-size')),
    );
  });

  it('has an accessible title, description, and a "View as table" link', async () => {
    const { container } = renderCloud();
    layout.resolve(PLACED);
    await screen.findAllByRole('img', { name: /times$/ });
    expectAccessibleChart(container, 'word-table');
  });

  it('shows a tooltip on hover, focus, and tap (FR-015)', async () => {
    renderCloud();
    layout.resolve(PLACED);
    const [the] = await screen.findAllByRole('img', { name: /times$/ });
    const entry = CHART_ENTRIES[0];
    if (!the || !entry) throw new Error('missing word');
    await expectWordTooltipInteractions(userEvent.setup(), the, entry);
  });

  it('cancels the layout on unmount', () => {
    const { unmount } = renderCloud();
    unmount();
    expect(layout.cancel).toHaveBeenCalled();
  });
});
