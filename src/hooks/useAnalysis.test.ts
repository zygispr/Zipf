import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FrequencyResult } from '../lib/types';
import type { AnalyzeRequest, WorkerMessage } from '../worker/messages';
import {
  analysisReducer,
  initialAnalysisState,
  useAnalysis,
  type AnalysisState,
  type WorkerLike,
} from './useAnalysis';

const result: FrequencyResult = {
  bookName: 'a.txt',
  totalWords: 3,
  distinctWords: 2,
  entries: [
    ['the', 2],
    ['cat', 1],
  ],
  isLikelyEnglish: true,
};

const processing: AnalysisState = {
  status: 'processing',
  fileName: 'a.txt',
  progress: 0.4,
  stage: 'extracting',
};
const results: AnalysisState = { status: 'results', result };
const failed: AnalysisState = { status: 'error', code: 'corrupted' };

describe('analysisReducer', () => {
  it('starts idle', () => {
    expect(initialAnalysisState).toEqual({ status: 'idle' });
  });

  it.each([initialAnalysisState, processing, results, failed])(
    'fileSelected from %o starts processing the new file',
    (state) => {
      expect(analysisReducer(state, { type: 'fileSelected', fileName: 'b.epub' })).toEqual({
        status: 'processing',
        fileName: 'b.epub',
        progress: 0,
        stage: 'reading',
      });
    },
  );

  it.each([initialAnalysisState, processing, results, failed])(
    'fileRejected from %o shows the error and discards the previous analysis',
    (state) => {
      expect(analysisReducer(state, { type: 'fileRejected', code: 'unsupported' })).toEqual({
        status: 'error',
        code: 'unsupported',
      });
    },
  );

  it('progress updates the fraction and stage while processing', () => {
    expect(
      analysisReducer(processing, { type: 'progress', stage: 'counting', fraction: 0.7 }),
    ).toEqual({ ...processing, stage: 'counting', progress: 0.7 });
  });

  it.each([initialAnalysisState, results, failed])('progress is ignored in %o', (state) => {
    expect(analysisReducer(state, { type: 'progress', stage: 'counting', fraction: 0.7 })).toBe(
      state,
    );
  });

  it('succeeded moves processing to results', () => {
    expect(analysisReducer(processing, { type: 'succeeded', result })).toEqual(results);
  });

  it('failed moves processing to error', () => {
    expect(analysisReducer(processing, { type: 'failed', code: 'protected' })).toEqual({
      status: 'error',
      code: 'protected',
    });
  });

  it.each([initialAnalysisState, results, failed])(
    'succeeded and failed are ignored outside processing (%o)',
    (state) => {
      expect(analysisReducer(state, { type: 'succeeded', result })).toBe(state);
      expect(analysisReducer(state, { type: 'failed', code: 'empty' })).toBe(state);
    },
  );

  it('cancelled moves processing back to idle', () => {
    expect(analysisReducer(processing, { type: 'cancelled' })).toEqual(initialAnalysisState);
  });

  it.each([processing, results, failed])('reset from %o goes back to idle', (state) => {
    expect(analysisReducer(state, { type: 'reset' })).toEqual(initialAnalysisState);
  });
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

function setup() {
  const workers: FakeWorker[] = [];
  const createWorker = () => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  };
  const hook = renderHook(() => useAnalysis({ createWorker }));
  const select = (file: File) => {
    act(() => {
      hook.result.current.selectFile(file);
    });
  };
  return { hook, workers, select };
}

const book = (name: string, content = 'some words') => new File([content], name);

describe('useAnalysis', () => {
  it('creates one worker per file and posts the analyze request', () => {
    const { hook, workers, select } = setup();
    const file = book('novel.txt');
    select(file);
    expect(workers).toHaveLength(1);
    expect(workers[0]?.posted).toEqual([{ type: 'analyze', file, format: 'txt' }]);
    expect(hook.result.current.state).toEqual({
      status: 'processing',
      fileName: 'novel.txt',
      progress: 0,
      stage: 'reading',
    });
  });

  it('shows progress, then results, and terminates the worker after the result', () => {
    const { hook, workers, select } = setup();
    select(book('a.txt'));
    const worker = workers[0];
    worker?.emit({ type: 'progress', stage: 'counting', fraction: 0.6 });
    expect(hook.result.current.state).toMatchObject({ stage: 'counting', progress: 0.6 });
    worker?.emit({ type: 'result', result });
    expect(hook.result.current.state).toEqual({ status: 'results', result });
    expect(worker?.terminated).toBe(true);
  });

  it('shows worker errors and terminates the worker', () => {
    const { hook, workers, select } = setup();
    select(book('a.epub'));
    workers[0]?.emit({ type: 'error', code: 'protected' });
    expect(hook.result.current.state).toEqual({ status: 'error', code: 'protected' });
    expect(workers[0]?.terminated).toBe(true);
  });

  it('reports a worker that fails to start as corrupted', () => {
    const { hook, workers, select } = setup();
    select(book('a.txt'));
    act(() => {
      workers[0]?.onerror?.(new ErrorEvent('error'));
    });
    expect(hook.result.current.state).toEqual({ status: 'error', code: 'corrupted' });
    expect(workers[0]?.terminated).toBe(true);
  });

  it('rejects invalid files without creating a worker', () => {
    const { hook, workers, select } = setup();
    select(book('a.pdf'));
    expect(workers).toHaveLength(0);
    expect(hook.result.current.state).toEqual({ status: 'error', code: 'unsupported' });
  });

  it('terminates the worker on cancel', () => {
    const { hook, workers, select } = setup();
    select(book('a.txt'));
    act(() => {
      hook.result.current.cancel();
    });
    expect(workers[0]?.terminated).toBe(true);
    expect(hook.result.current.state).toEqual({ status: 'idle' });
  });

  it('terminates the worker on reset', () => {
    const { hook, workers, select } = setup();
    select(book('a.txt'));
    act(() => {
      hook.result.current.reset();
    });
    expect(workers[0]?.terminated).toBe(true);
    expect(hook.result.current.state).toEqual({ status: 'idle' });
  });

  it('replaces a running analysis and ignores messages from the old worker', () => {
    const { hook, workers, select } = setup();
    select(book('first.txt'));
    select(book('second.epub'));
    const [first, second] = workers;
    expect(first?.terminated).toBe(true);
    expect(second?.posted[0]).toMatchObject({ format: 'epub' });
    first?.emit({ type: 'result', result });
    first?.emit({ type: 'progress', stage: 'counting', fraction: 0.9 });
    expect(hook.result.current.state).toEqual({
      status: 'processing',
      fileName: 'second.epub',
      progress: 0,
      stage: 'reading',
    });
  });

  it('replaces shown results with a new analysis', () => {
    const { hook, workers, select } = setup();
    select(book('first.txt'));
    workers[0]?.emit({ type: 'result', result });
    select(book('second.txt'));
    expect(workers).toHaveLength(2);
    expect(hook.result.current.state).toMatchObject({
      status: 'processing',
      fileName: 'second.txt',
    });
  });

  it('terminates a running analysis when an invalid file replaces it', () => {
    const { hook, workers, select } = setup();
    select(book('first.txt'));
    select(book('huge.txt', ''));
    expect(workers[0]?.terminated).toBe(true);
    expect(hook.result.current.state).toEqual({ status: 'error', code: 'empty' });
  });

  it('terminates the worker on unmount', () => {
    const { hook, workers, select } = setup();
    select(book('a.txt'));
    hook.unmount();
    expect(workers[0]?.terminated).toBe(true);
  });
});
