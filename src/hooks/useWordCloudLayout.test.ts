import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WordEntry } from '../lib/types';
import type { PlacedWord } from '../lib/wordCloudLayout';
import type { WordCloudRequest, WordCloudResponse } from '../worker/wordCloudMessages';
import { useWordCloudLayout, type WordCloudWorkerLike } from './useWordCloudLayout';

class FakeWorker implements WordCloudWorkerLike {
  onmessage: ((event: MessageEvent<WordCloudResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: WordCloudRequest[] = [];
  terminated = false;
  postMessage(message: WordCloudRequest) {
    this.posted.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  respond(message: WordCloudResponse) {
    act(() => {
      this.onmessage?.({ data: message } as MessageEvent<WordCloudResponse>);
    });
  }
}

const ENTRIES: WordEntry[] = [
  { word: 'the', count: 9, rank: 1, percent: 60 },
  { word: 'cat', count: 4, rank: 2, percent: 26.67 },
  { word: 'hat', count: 2, rank: 3, percent: 13.33 },
];

const placed = (words: WordCloudRequest['words']): PlacedWord[] =>
  words.map((word, i) => ({ ...word, x: i * 10, y: 0, rotate: 0 }));

function setup(entries = ENTRIES, size = { width: 600, height: 400 }) {
  const workers: FakeWorker[] = [];
  const createWorker = () => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  };
  const hook = renderHook(
    ({ entries, size }) => useWordCloudLayout(entries, size, { createWorker }),
    { initialProps: { entries, size } },
  );
  const worker = (index: number) => {
    const found = workers[index];
    if (!found) throw new Error(`no worker ${String(index)}`);
    return found;
  };
  return { ...hook, workers, worker };
}

describe('useWordCloudLayout', () => {
  it('sends the sized words and the cloud size to a worker', () => {
    const { result, worker } = setup();
    expect(result.current).toEqual({ words: null, failed: false });
    const [request] = worker(0).posted;
    expect(request).toMatchObject({ width: 600, height: 400 });
    expect(request?.words.map((word) => word.word)).toEqual(['the', 'cat', 'hat']);
    expect(request?.words[0]?.size).toBeGreaterThan(request?.words[2]?.size ?? Infinity);
  });

  it('returns the placed words and stops the worker', () => {
    const { result, worker } = setup();
    const words = placed(worker(0).posted[0]?.words ?? []);
    worker(0).respond({ type: 'layout', words });
    expect(result.current).toEqual({ words, failed: false });
    expect(worker(0).terminated).toBe(true);
  });

  it('keeps the previous layout while a new size is laid out, and drops the stale worker', () => {
    const { result, worker, rerender } = setup();
    const first = placed(worker(0).posted[0]?.words ?? []);
    worker(0).respond({ type: 'layout', words: first });

    rerender({ entries: ENTRIES, size: { width: 320, height: 280 } });
    expect(worker(1).posted[0]).toMatchObject({ width: 320, height: 280 });
    expect(result.current.words).toBe(first);

    const second = placed(worker(1).posted[0]?.words ?? []);
    worker(1).respond({ type: 'layout', words: second });
    expect(result.current.words).toBe(second);
  });

  it('terminates a running layout when the input changes or the chart unmounts', () => {
    const { worker, rerender, unmount } = setup();
    rerender({ entries: ENTRIES.slice(0, 2), size: { width: 600, height: 400 } });
    expect(worker(0).terminated).toBe(true);
    unmount();
    expect(worker(1).terminated).toBe(true);
  });

  it('ignores a result from a worker it already replaced', () => {
    const { result, worker, rerender } = setup();
    rerender({ entries: ENTRIES.slice(0, 2), size: { width: 600, height: 400 } });
    worker(0).respond({ type: 'layout', words: placed(worker(0).posted[0]?.words ?? []) });
    expect(result.current.words).toBeNull();
  });

  it('reports a failure the worker sends', () => {
    const { result, worker } = setup();
    worker(0).respond({ type: 'error' });
    expect(result.current).toEqual({ words: null, failed: true });
    expect(worker(0).terminated).toBe(true);
  });

  it('reports a worker that crashes', () => {
    const { result, worker } = setup();
    act(() => {
      worker(0).onerror?.(new ErrorEvent('error'));
    });
    expect(result.current.failed).toBe(true);
  });

  it('reports a worker that cannot be started, rendering only once more', () => {
    const createWorker = vi.fn((): WordCloudWorkerLike => {
      throw new Error('Worker is not defined');
    });
    let renders = 0;
    const { result, rerender } = renderHook(() => {
      renders++;
      return useWordCloudLayout(ENTRIES, { width: 600, height: 400 }, { createWorker });
    });
    expect(result.current.failed).toBe(true);
    expect(renders).toBe(2);
    rerender();
    expect(createWorker).toHaveBeenCalledTimes(1);
  });
});
