// Runs the word cloud layout in its own worker (see src/lib/placeWords.ts), one worker per layout.
import { useEffect, useState } from 'react';
import type { WordEntry } from '../lib/types';
import { sizeWords, type PlacedWord } from '../lib/wordCloudLayout';
import type { WordCloudRequest, WordCloudResponse } from '../worker/wordCloudMessages';
// Inline like the analysis worker, so drawing the cloud makes no network request (SC-006).
import WordCloudWorker from '../worker/wordCloud.worker.ts?worker&inline';

export interface WordCloudWorkerLike {
  postMessage(message: WordCloudRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<WordCloudResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export interface UseWordCloudLayoutOptions {
  /** Injected in tests; the real word cloud worker by default. */
  createWorker?: () => WordCloudWorkerLike;
}

export interface WordCloudLayoutState {
  /** The latest finished layout; kept while a new one (e.g. after a resize) is computed. */
  words: PlacedWord[] | null;
  failed: boolean;
}

const createWordCloudWorker = (): WordCloudWorkerLike => new WordCloudWorker();

/** Returns the same state when it already failed, so failing again doesn't re-render. */
const markFailed = (previous: WordCloudLayoutState): WordCloudLayoutState =>
  previous.failed ? previous : { ...previous, failed: true };

export function useWordCloudLayout(
  entries: readonly WordEntry[],
  { width, height }: { width: number; height: number },
  { createWorker = createWordCloudWorker }: UseWordCloudLayoutOptions = {},
): WordCloudLayoutState {
  const [state, setState] = useState<WordCloudLayoutState>({ words: null, failed: false });

  useEffect(() => {
    let worker: WordCloudWorkerLike;
    try {
      worker = createWorker();
    } catch {
      // Only when no worker can be started at all. It can't cascade: once failed, markFailed keeps
      // the same state, so React skips the re-render. The chart then explains the cloud is missing.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(markFailed);
      return;
    }
    // Set to false on cleanup, so a stale worker's answer is ignored.
    let current = true;
    const fail = () => {
      if (current) setState(markFailed);
      worker.terminate();
    };
    worker.onmessage = ({ data }) => {
      if (data.type === 'error') {
        fail();
        return;
      }
      if (current) setState({ words: data.words, failed: false });
      worker.terminate();
    };
    worker.onerror = fail;
    worker.postMessage({ words: sizeWords(entries, width), width, height });
    return () => {
      current = false;
      worker.terminate();
    };
  }, [entries, width, height, createWorker]);

  return state;
}
