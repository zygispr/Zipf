# Contract: Analysis Worker Messages

The only internal boundary in the app: the main thread (`useAnalysis` hook) ↔ the analysis Web
Worker (`src/worker/analysis.worker.ts`). Types live in `src/worker/messages.ts` and are imported
by both sides.

One worker instance handles exactly **one** analysis. To cancel or replace an analysis, the main
thread calls `worker.terminate()`, and there is no cancel message. That rule keeps the protocol
stateless and guarantees book data is released.

## Main → Worker

```ts
type AnalyzeRequest = {
  type: 'analyze';
  file: File;              // structured-cloned; format already validated on main thread
  format: 'txt' | 'epub';
};
```

Sent once, right after the worker is created.

## Worker → Main

```ts
type ProgressMessage = {
  type: 'progress';
  stage: 'reading' | 'extracting' | 'counting';
  fraction: number;        // 0..1, never decreases within one analysis
};

type ResultMessage = {
  type: 'result';
  result: FrequencyResult; // see data-model.md
};

type ErrorMessage = {
  type: 'error';
  code: 'empty' | 'corrupted' | 'protected';
};

type WorkerMessage = ProgressMessage | ResultMessage | ErrorMessage;
```

## Guarantees

1. The worker sends zero or more `progress` messages, then **exactly one** `result` or `error`,
   and nothing after that.
2. `progress.fraction` never decreases, and progress messages are throttled to at most one every
   50 ms.
3. `result.result.entries` is sorted by count descending, then word ascending, and
   `totalWords === sum(counts)`.
4. The worker makes no network requests and uses no storage APIs.
5. Unexpected exceptions are caught and reported as `{ type: 'error', code: 'corrupted' }`. The
   worker never throws to the main thread without a message.
6. `unsupported` and `too-large` are never produced by the worker. The main thread checks those
   before starting it.

## Contract tests (`tests/contract/worker-messages.test.ts`)

The worker module exports its handler as a pure async function
`handleAnalyze(request, emit)`. The tests call it directly with fixture files and check
guarantees 1, 2, 3, 5, and 6 for: a `.txt` fixture, an `.epub` fixture, an empty file, a corrupted
zip, and a DRM-encrypted EPUB.
