// Main thread ↔ analysis worker protocol: specs/001-book-word-frequency/contracts/worker-messages.md
import type { BookFormat, FrequencyResult } from '../lib/types';

/** Sent once, right after the worker is created. */
export interface AnalyzeRequest {
  type: 'analyze';
  /** Structured-cloned; format already validated on the main thread. */
  file: File;
  format: BookFormat;
}

export interface ProgressMessage {
  type: 'progress';
  stage: 'reading' | 'extracting' | 'counting';
  /** 0..1, never decreases within one analysis. */
  fraction: number;
}

export interface ResultMessage {
  type: 'result';
  result: FrequencyResult;
}

/** `unsupported` and `too-large` are checked on the main thread, never by the worker. */
export interface ErrorMessage {
  type: 'error';
  code: 'empty' | 'corrupted' | 'protected';
}

export type WorkerMessage = ProgressMessage | ResultMessage | ErrorMessage;

export type Emit = (message: WorkerMessage) => void;
