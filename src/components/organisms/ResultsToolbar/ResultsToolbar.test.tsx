import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResultsToolbar, type ResultsToolbarProps } from './ResultsToolbar';

const renderToolbar = (props: Partial<ResultsToolbarProps> = {}) => {
  const all: ResultsToolbarProps = {
    visualization: 'bar',
    onVisualizationChange: vi.fn(),
    topN: 25,
    onTopNChange: vi.fn(),
    hideCommonWords: false,
    onHideCommonWordsChange: vi.fn(),
    canHideCommonWords: true,
    onDownload: vi.fn(),
    onNewBook: vi.fn(),
    ...props,
  };
  render(<ResultsToolbar {...all} />);
  return all;
};

describe('ResultsToolbar', () => {
  it('starts over with "New book" (FR-023)', async () => {
    const { onNewBook } = renderToolbar();
    await userEvent.click(screen.getByRole('button', { name: 'New book' }));
    expect(onNewBook).toHaveBeenCalledTimes(1);
  });

  it('downloads the results (FR-022)', async () => {
    const { onDownload } = renderToolbar();
    await userEvent.click(screen.getByRole('button', { name: 'Download results' }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it('switches between the three visualizations (FR-014)', async () => {
    const { onVisualizationChange } = renderToolbar({ visualization: 'cloud' });
    const group = screen.getByRole('radiogroup', { name: 'Visualization' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Word cloud' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(screen.getByRole('radio', { name: "Zipf's law" }));
    expect(onVisualizationChange).toHaveBeenCalledWith('zipf');
    await userEvent.click(screen.getByRole('radio', { name: 'Bar chart' }));
    expect(onVisualizationChange).toHaveBeenCalledWith('bar');
  });

  it('chooses 10, 25, 50, or 100 top words (FR-020)', async () => {
    const { onTopNChange } = renderToolbar({ topN: 25 });
    const group = screen.getByRole('radiogroup', { name: 'Top words' });
    const options = within(group).getAllByRole('radio');
    expect(options.map((option) => option.textContent)).toEqual(['10', '25', '50', '100']);
    expect(within(group).getByRole('radio', { name: '25' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(within(group).getByRole('radio', { name: '100' }));
    expect(onTopNChange).toHaveBeenCalledWith(100);
    await userEvent.click(within(group).getByRole('radio', { name: '10' }));
    expect(onTopNChange).toHaveBeenCalledWith(10);
  });

  it('hides common words with a switch (FR-019)', async () => {
    const { onHideCommonWordsChange } = renderToolbar({ hideCommonWords: false });
    const toggle = screen.getByRole('switch', { name: 'Hide common words' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(toggle);
    expect(onHideCommonWordsChange).toHaveBeenCalledWith(true);
  });

  it('reflects hidden common words and turns the filter off', async () => {
    const { onHideCommonWordsChange } = renderToolbar({ hideCommonWords: true });
    const toggle = screen.getByRole('switch', { name: 'Hide common words' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(toggle);
    expect(onHideCommonWordsChange).toHaveBeenCalledWith(false);
  });

  it('disables the switch with an explanation for books that are not English (research R6)', async () => {
    const { onHideCommonWordsChange } = renderToolbar({ canHideCommonWords: false });
    const toggle = screen.getByRole('switch', { name: 'Hide common words' });
    expect(toggle).toHaveAttribute('aria-disabled', 'true');
    expect(toggle).toHaveAccessibleDescription(
      'Common-word filtering is available for English books',
    );
    expect(screen.getByText('Common-word filtering is available for English books')).toBeVisible();
    await userEvent.click(toggle);
    expect(onHideCommonWordsChange).not.toHaveBeenCalled();
  });
});
