// Analysis state machine (data-model.md) as a pure reducer, plus the worker lifecycle (research R14).
import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { AnalysisErrorCode, FrequencyResult } from '../lib/types';
import { validateFile } from '../lib/validateFile';
import type { AnalyzeRequest, ProgressMessage, WorkerMessage } from '../worker/messages';
// Bundled into the page and started from a blob: URL, so starting an analysis makes no network
// request (SC-006) and the worker inherits the page CSP (research R2).
import AnalysisWorker from '../worker/analysis.worker.ts?worker&inline';

export type AnalysisStage = ProgressMessage['stage'];

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'processing'; fileName: string; progress: number; stage: AnalysisStage }
  | { status: 'results'; result: FrequencyResult }
  | { status: 'error'; code: AnalysisErrorCode };

export type AnalysisAction =
  | { type: 'fileSelected'; fileName: string }
  | { type: 'fileRejected'; code: AnalysisErrorCode }
  | { type: 'progress'; stage: AnalysisStage; fraction: number }
  | { type: 'succeeded'; result: FrequencyResult }
  | { type: 'failed'; code: AnalysisErrorCode }
  | { type: 'cancelled' }
  | { type: 'reset' };

export const initialAnalysisState: AnalysisState = { status: 'idle' };

export function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    // A new book can arrive in any state; the previous analysis is discarded.
    case 'fileSelected':
      return { status: 'processing', fileName: action.fileName, progress: 0, stage: 'reading' };
    case 'fileRejected':
      return { status: 'error', code: action.code };
    case 'reset':
      return initialAnalysisState;
  }
  if (state.status !== 'processing') return state;
  switch (action.type) {
    case 'progress':
      return { ...state, stage: action.stage, progress: action.fraction };
    case 'succeeded':
      return { status: 'results', result: action.result };
    case 'failed':
      return { status: 'error', code: action.code };
    case 'cancelled':
      return initialAnalysisState;
  }
}

/** The part of `Worker` the hook uses, so tests can inject a fake. */
export interface WorkerLike {
  postMessage(message: AnalyzeRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export interface UseAnalysisOptions {
  createWorker?: () => WorkerLike;
}

const createAnalysisWorker = (): WorkerLike => new AnalysisWorker();

export function useAnalysis({ createWorker = createAnalysisWorker }: UseAnalysisOptions = {}) {
  const [state, dispatch] = useReducer(analysisReducer, initialAnalysisState);
  const workerRef = useRef<WorkerLike | null>(null);

  // Terminating the worker also discards every copy of the book it holds (FR-004).
  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => stopWorker, [stopWorker]);

  const selectFile = useCallback(
    (file: File) => {
      stopWorker();
      const validation = validateFile(file);
      if (!validation.ok) {
        dispatch({ type: 'fileRejected', code: validation.code });
        return;
      }
      const worker = createWorker();
      workerRef.current = worker;
      worker.onmessage = ({ data: message }) => {
        // Messages from a replaced or cancelled analysis are ignored.
        if (workerRef.current !== worker) return;
        if (message.type === 'progress') {
          dispatch({ type: 'progress', stage: message.stage, fraction: message.fraction });
          return;
        }
        stopWorker();
        dispatch(
          message.type === 'result'
            ? { type: 'succeeded', result: message.result }
            : { type: 'failed', code: message.code },
        );
      };
      worker.onerror = () => {
        if (workerRef.current !== worker) return;
        stopWorker();
        dispatch({ type: 'failed', code: 'corrupted' });
      };
      dispatch({ type: 'fileSelected', fileName: file.name });
      worker.postMessage({ type: 'analyze', file, format: validation.format });
    },
    [createWorker, stopWorker],
  );

  const cancel = useCallback(() => {
    stopWorker();
    dispatch({ type: 'cancelled' });
  }, [stopWorker]);

  const reset = useCallback(() => {
    stopWorker();
    dispatch({ type: 'reset' });
  }, [stopWorker]);

  return { state, selectFile, cancel, reset };
}
