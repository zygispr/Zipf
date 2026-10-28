import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'motion/react';
import { Profiler, type ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkerLike } from '../../../hooks/useAnalysis';
import { ERROR_MESSAGES } from '../../../lib/errorMessages';
import type { FrequencyResult } from '../../../lib/types';
import type { AnalyzeRequest, WorkerMessage } from '../../../worker/messages';
import { HomePage } from './HomePage';

// Counts commits of the chart subtree, to check that typing a search re-renders no chart.
const chartRenders = vi.hoisted(() => ({ count: 0 }));
vi.mock('../../organisms/VisualizationPanel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../organisms/VisualizationPanel')>();
  return {
    VisualizationPanel: (props: ComponentProps<typeof actual.VisualizationPanel>) => (
      <Profiler
        id="visualization"
        onRender={() => {
          chartRenders.count++;
        }}
      >
        <actual.VisualizationPanel {...props} />
      </Profiler>
    ),
  };
});

beforeEach(() => {
  chartRenders.count = 0;
});

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: AnalyzeRequest[] = [];
  terminated = false;
  postMessage(message: AnalyzeRequest) {
    this.posted.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  emit(message: WorkerMessage) {
    act(() => {
      this.onmessage?.({ data: message } as MessageEvent<WorkerMessage>);
    });
  }
}

const resultFor = (bookName: string): FrequencyResult => ({
  bookName,
  totalWords: 6,
  distinctWords: 3,
  entries: [
    ['the', 3],
    ['cat', 2],
    ['hat', 1],
  ],
  isLikelyEnglish: true,
});

/** 120 distinct words, so the table has 3 pages; "the", "and", and "of" are common words. */
const largeResult = (): FrequencyResult => {
  const entries: [string, number][] = [
    ['the', 500],
    ['and', 400],
    ['of', 300],
    ...Array.from({ length: 117 }, (_, i): [string, number] => [`word${String(i + 1)}`, 117 - i]),
  ];
  return {
    bookName: 'big.txt',
    totalWords: entries.reduce((sum, [, count]) => sum + count, 0),
    distinctWords: entries.length,
    entries,
    isLikelyEnglish: true,
  };
};

const fileDrag = (files: File[] = []) => ({ dataTransfer: { files, types: ['Files'] } });

function setup() {
  const workers: FakeWorker[] = [];
  const createWorker = () => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  };
  const user = userEvent.setup();
  const view = render(
    <MotionConfig reducedMotion="always">
      <HomePage createWorker={createWorker} />
    </MotionConfig>,
  );
  const upload = async (file: File) => {
    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('missing file input');
    await user.upload(input, file);
  };
  const lastWorker = () => {
    const worker = workers.at(-1);
    if (!worker) throw new Error('no worker');
    return worker;
  };
  return { workers, user, upload, lastWorker };
}

describe('HomePage', () => {
  it('goes idle → processing → results → idle', async () => {
    const { user, upload, lastWorker } = setup();
    expect(screen.getByRole('button', { name: 'Choose a book' })).toHaveFocus();

    await upload(new File(['the cat'], 'novel.txt'));
    expect(await screen.findByRole('heading', { name: 'Analyzing novel.txt' })).toBeInTheDocument();
    lastWorker().emit({ type: 'progress', stage: 'counting', fraction: 0.6 });
    expect(screen.getByText('Counting words…')).toBeInTheDocument();

    lastWorker().emit({ type: 'result', result: resultFor('novel.txt') });
    const heading = await screen.findByRole('heading', { level: 2, name: 'novel.txt' });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(screen.getByRole('group', { name: 'Total words' })).toHaveTextContent('6');
    expect(screen.getByRole('group', { name: 'Most frequent word' })).toHaveTextContent('the');
    expect(screen.getByRole('table', { name: 'All words by frequency' })).toHaveTextContent('cat');

    await user.click(screen.getByRole('button', { name: 'New book' }));
    const chooseBook = await screen.findByRole('button', { name: 'Choose a book' });
    await waitFor(() => {
      expect(chooseBook).toHaveFocus();
    });
  });

  it('shows the bar chart and switches visualizations (US2)', async () => {
    const { user, upload, lastWorker } = setup();
    await upload(new File(['the cat'], 'novel.txt'));
    lastWorker().emit({ type: 'result', result: resultFor('novel.txt') });
    expect(await screen.findByRole('group', { name: /bar chart/i })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /times$/ })).toHaveLength(3);

    await user.click(screen.getByRole('radio', { name: "Zipf's law" }));
    expect(await screen.findByRole('group', { name: /zipf/i })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'View as table' });
    const tableId = link.getAttribute('href')?.slice(1) ?? '';
    expect(document.getElementById(tableId)).toContainElement(
      screen.getByRole('table', { name: 'All words by frequency' }),
    );
  });

  it('shows worker errors and recovers with "Choose another book"', async () => {
    const { user, upload, lastWorker } = setup();
    await upload(new File(['x'], 'locked.epub'));
    await screen.findByRole('heading', { name: 'Analyzing locked.epub' });
    lastWorker().emit({ type: 'error', code: 'protected' });
    expect(await screen.findByRole('alert')).toHaveTextContent(ERROR_MESSAGES.protected);
    await user.click(screen.getByRole('button', { name: 'Choose another book' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose a book' })).toHaveFocus();
  });

  it('rejects an unsupported file dropped on the page without starting a worker', async () => {
    const { workers } = setup();
    act(() => {
      fireEvent.drop(window, fileDrag([new File(['%PDF'], 'book.pdf')]));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(ERROR_MESSAGES.unsupported);
    expect(workers).toHaveLength(0);
  });

  it('replaces a running analysis with a book dropped on the page', async () => {
    const { upload, workers } = setup();
    await upload(new File(['first'], 'first.txt'));
    act(() => {
      fireEvent.drop(window, fileDrag([new File(['second'], 'second.txt')]));
    });
    expect(workers).toHaveLength(2);
    expect(workers[0]?.terminated).toBe(true);
    expect(
      await screen.findByRole('heading', { name: 'Analyzing second.txt' }),
    ).toBeInTheDocument();
  });

  it('replaces shown results with a book dropped on the page', async () => {
    const { upload, lastWorker } = setup();
    await upload(new File(['first'], 'first.txt'));
    lastWorker().emit({ type: 'result', result: resultFor('first.txt') });
    await screen.findByRole('heading', { level: 2, name: 'first.txt' });
    act(() => {
      fireEvent.drop(window, fileDrag([new File(['second'], 'second.txt')]));
    });
    expect(
      await screen.findByRole('heading', { name: 'Analyzing second.txt' }),
    ).toBeInTheDocument();
    lastWorker().emit({ type: 'result', result: resultFor('second.txt') });
    expect(
      await screen.findByRole('heading', { level: 2, name: 'second.txt' }),
    ).toBeInTheDocument();
  });

  it('shows the drop overlay while a file is dragged over the page', async () => {
    setup();
    act(() => {
      fireEvent.dragEnter(window, fileDrag());
    });
    expect(screen.getByText('Drop your book to analyze it')).toBeInTheDocument();
    act(() => {
      fireEvent.dragLeave(window, fileDrag());
    });
    await waitFor(() => {
      expect(screen.queryByText('Drop your book to analyze it')).not.toBeInTheDocument();
    });
  });

  describe('refining results (US3)', () => {
    async function showResult(result: FrequencyResult) {
      const { user, upload, lastWorker } = setup();
      await upload(new File(['x'], result.bookName));
      lastWorker().emit({ type: 'result', result });
      await screen.findByRole('heading', { level: 2, name: result.bookName });
      return user;
    }

    it('typing a search re-renders no chart', async () => {
      const user = await showResult(largeResult());
      const before = chartRenders.count;
      expect(before).toBeGreaterThan(0);
      await user.type(screen.getByRole('searchbox', { name: 'Find a word' }), 'word5');
      expect(screen.getByRole('status')).toHaveTextContent('word5: 113 times · rank #8');
      expect(chartRenders.count).toBe(before);
    });

    it('hiding common words re-ranks the table, resets it to page 1, and keeps book totals', async () => {
      const user = await showResult(largeResult());
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

      await user.click(screen.getByRole('switch', { name: 'Hide common words' }));
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      const table = screen.getByRole('table', { name: 'All words by frequency' });
      const firstRow = within(table).getAllByRole('row')[1];
      expect(firstRow).toHaveTextContent('1word1');
      expect(within(table).queryByRole('rowheader', { name: 'the' })).not.toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Total words' })).toHaveTextContent('8,103');
      expect(screen.getByText(/book totals/i)).toBeInTheDocument();

      await user.type(screen.getByRole('searchbox', { name: 'Find a word' }), 'the');
      expect(screen.getByRole('status')).toHaveTextContent('“the” is a common word, hidden');

      await user.click(screen.getByRole('switch', { name: 'Hide common words' }));
      const restored = screen.getByRole('table', { name: 'All words by frequency' });
      expect(within(restored).getByRole('rowheader', { name: 'the' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('the: 500 times · rank #1');
      expect(screen.queryByText(/book totals/i)).not.toBeInTheDocument();
    });

    it('changes the number of bars with "Top words"', async () => {
      const user = await showResult(largeResult());
      expect(screen.getAllByRole('img', { name: /times$/ })).toHaveLength(25);
      await user.click(screen.getByRole('radio', { name: '10' }));
      expect(screen.getAllByRole('img', { name: /times$/ })).toHaveLength(10);
      await user.click(screen.getByRole('radio', { name: '100' }));
      expect(screen.getAllByRole('img', { name: /times$/ })).toHaveLength(100);
    });

    it('disables hiding common words for a book that is not English', async () => {
      await showResult({ ...resultFor('мир.txt'), isLikelyEnglish: false });
      expect(screen.getByRole('switch', { name: 'Hide common words' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });
  });
});
