import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'motion/react';
import { describe, expect, it } from 'vitest';
import type { WorkerLike } from '../../../hooks/useAnalysis';
import { ERROR_MESSAGES } from '../../../lib/errorMessages';
import type { FrequencyResult } from '../../../lib/types';
import type { AnalyzeRequest, WorkerMessage } from '../../../worker/messages';
import { HomePage } from './HomePage';

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
});
