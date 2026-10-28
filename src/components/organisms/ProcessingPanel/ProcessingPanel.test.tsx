import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AnalysisStage } from '../../../hooks/useAnalysis';
import { ProcessingPanel } from './ProcessingPanel';

function renderPanel(stage: AnalysisStage = 'reading', progress = 0) {
  const onCancel = vi.fn();
  const onFile = vi.fn();
  const view = render(
    <ProcessingPanel
      fileName="novel.epub"
      stage={stage}
      progress={progress}
      onCancel={onCancel}
      onFile={onFile}
    />,
  );
  return { ...view, onCancel, onFile };
}

describe('ProcessingPanel', () => {
  it('names the book being analyzed and shows a spinner', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Analyzing novel.epub' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it.each([
    ['reading', 'Reading file…'],
    ['extracting', 'Extracting text…'],
    ['counting', 'Counting words…'],
  ] as const)('labels the %s stage', (stage, label) => {
    renderPanel(stage);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('shows the progress value', () => {
    renderPanel('counting', 0.6);
    expect(screen.getByRole('progressbar', { name: 'Analysis progress' })).toHaveAttribute(
      'aria-valuenow',
      '60',
    );
  });

  it('focuses Cancel and calls onCancel (FR-024)', async () => {
    const { onCancel } = renderPanel();
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveFocus();
    await userEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('lets the user choose a different book', async () => {
    const { container, onFile } = renderPanel();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('missing file input');
    expect(input).toHaveAttribute('accept', '.txt,.epub');
    const click = vi.spyOn(input, 'click');
    await userEvent.click(screen.getByRole('button', { name: 'Choose a different book' }));
    expect(click).toHaveBeenCalledTimes(1);
    const book = new File(['words'], 'other.txt');
    await userEvent.upload(input, book);
    expect(onFile).toHaveBeenCalledWith(book);
  });
});
