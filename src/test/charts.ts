// Shared assertions for the three charts' word tooltips (FR-015).
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { expect } from 'vitest';
import type { WordEntry } from '../lib/types';

export const CHART_ENTRIES: WordEntry[] = [
  { word: 'the', count: 40, rank: 1, percent: 50 },
  { word: 'cat', count: 20, rank: 2, percent: 25 },
  { word: 'hat', count: 10, rank: 3, percent: 12.5 },
];

export function expectTooltipFor(entry: WordEntry) {
  const tooltip = screen.getByRole('tooltip');
  expect(tooltip).toHaveTextContent(entry.word);
  expect(tooltip).toHaveTextContent(`Count: ${String(entry.count)}`);
  expect(tooltip).toHaveTextContent(`Rank: #${String(entry.rank)}`);
  expect(tooltip).toHaveTextContent(`${entry.percent.toFixed(2)}% of words`);
}

export async function expectNoTooltip() {
  await waitFor(() => {
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
}

/** Hover, focus + Escape, and tap (open, tap again, tap outside) all drive the tooltip. */
export async function expectWordTooltipInteractions(
  user: UserEvent,
  mark: Element,
  entry: WordEntry,
) {
  await user.hover(mark);
  expectTooltipFor(entry);
  await user.unhover(mark);
  await expectNoTooltip();

  (mark as SVGElement).focus();
  await waitFor(() => {
    expectTooltipFor(entry);
  });
  await user.keyboard('{Escape}');
  await expectNoTooltip();
  (mark as SVGElement).blur();

  const tap = () => {
    fireEvent.pointerDown(mark, { pointerType: 'touch' });
    fireEvent.pointerUp(mark, { pointerType: 'touch' });
  };
  tap();
  expectTooltipFor(entry);
  tap();
  await expectNoTooltip();
  tap();
  expectTooltipFor(entry);
  fireEvent.pointerDown(document.body, { pointerType: 'touch' });
  await expectNoTooltip();
}

export function expectAccessibleChart(container: HTMLElement, tableId: string) {
  const svg = container.querySelector('svg[aria-labelledby]');
  expect(svg?.querySelector('title')?.textContent).toBeTruthy();
  expect(svg?.querySelector('desc')?.textContent).toBeTruthy();
  expect(screen.getByRole('link', { name: 'View as table' })).toHaveAttribute(
    'href',
    `#${tableId}`,
  );
}
