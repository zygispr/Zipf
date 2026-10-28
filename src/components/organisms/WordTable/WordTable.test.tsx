import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { WordEntry } from '../../../lib/types';
import { WordTable } from './WordTable';

const makeEntries = (n: number): WordEntry[] =>
  Array.from({ length: n }, (_, i) => ({
    word: `word${String(i + 1)}`,
    count: 5000 - i,
    rank: i + 1,
    percent: 12.3456 - i / 100,
  }));

const bodyRows = () =>
  within(screen.getByRole('table', { name: 'All words by frequency' }))
    .getAllByRole('row')
    .slice(1);

describe('WordTable', () => {
  it('is a semantic table with rank, word, count, and percent columns (FR-012)', () => {
    render(<WordTable entries={makeEntries(3)} />);
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['Rank', 'Word', 'Count', '%']);
  });

  it('shows 50 rows on page 1 with formatted values', () => {
    render(<WordTable entries={makeEntries(120)} />);
    const rows = bodyRows();
    expect(rows).toHaveLength(50);
    const cells = [...(rows[0]?.querySelectorAll('th, td') ?? [])].map((cell) => cell.textContent);
    expect(cells).toEqual(['1', 'word1', '5,000', '12.35']);
  });

  it('shows a partial last page', async () => {
    const user = userEvent.setup();
    render(<WordTable entries={makeEntries(120)} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
    const rows = bodyRows();
    expect(rows).toHaveLength(20);
    expect(rows[0]).toHaveTextContent('word101');
  });

  it('hides pagination when everything fits on one page', () => {
    render(<WordTable entries={makeEntries(50)} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
