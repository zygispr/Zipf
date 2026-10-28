import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'motion/react';
import { describe, expect, it, vi } from 'vitest';
import { selectView } from '../../../lib/selectView';
import {
  DEFAULT_VIEW_SETTINGS,
  type FrequencyResult,
  type VisualizationType,
} from '../../../lib/types';
import { VisualizationPanel } from './VisualizationPanel';

// The browser reports that the user prefers reduced motion.
vi.stubGlobal(
  'matchMedia',
  vi.fn((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
);

vi.mock('../../../lib/wordCloudLayout', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/wordCloudLayout')>()),
  computeWordCloudLayout: () => ({ layout: new Promise(() => undefined), cancel: () => undefined }),
}));

const result: FrequencyResult = {
  bookName: 'tiny.txt',
  totalWords: 7,
  distinctWords: 3,
  entries: [
    ['the', 4],
    ['cat', 2],
    ['hat', 1],
  ],
  isLikelyEnglish: true,
};
const view = selectView(result, DEFAULT_VIEW_SETTINGS);

const panel = (visualization: VisualizationType, reducedMotion: 'user' | 'never') => (
  <MotionConfig reducedMotion={reducedMotion}>
    <VisualizationPanel visualization={visualization} view={view} tableId="word-table" />
  </MotionConfig>
);

const chartTitle = (name: RegExp) => screen.findByRole('group', { name });

describe('VisualizationPanel', () => {
  it.each([
    ['bar', /bar chart/i],
    ['cloud', /word cloud/i],
    ['zipf', /zipf/i],
  ] as const)('renders the %s chart', async (visualization, name) => {
    render(panel(visualization, 'never'));
    expect(await chartTitle(name)).toBeInTheDocument();
  });

  it('swaps charts with an animated transition', async () => {
    const { rerender } = render(panel('bar', 'never'));
    await chartTitle(/bar chart/i);
    rerender(panel('zipf', 'never'));
    expect(
      await screen.findByRole('group', { name: /zipf/i }, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /bar chart/i })).not.toBeInTheDocument();
  });

  it('swaps charts without a transition delay when the user prefers reduced motion', async () => {
    const { rerender } = render(panel('bar', 'user'));
    await chartTitle(/bar chart/i);
    rerender(panel('zipf', 'user'));
    // The normal cross-fade takes hundreds of milliseconds; reduced motion must not wait for it.
    expect(
      await screen.findByRole('group', { name: /zipf/i }, { timeout: 120 }),
    ).toBeInTheDocument();
  });
});
