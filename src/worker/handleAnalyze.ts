// The whole analysis pipeline as a pure async function. It never touches `self`, so Node tests can
// import it (contracts/worker-messages.md).
import { countWords } from '../lib/countWords';
import { decodeText } from '../lib/decodeText';
import { EpubError, extractEpubText } from '../lib/epub';
import type {
  AnalyzeRequest,
  Emit,
  ErrorMessage,
  ProgressMessage,
  ResultMessage,
} from './messages';

const PROGRESS_INTERVAL_MS = 50;

/** At most one progress message per 50 ms, and the fraction never decreases (guarantee 2). */
function createProgressReporter(emit: Emit) {
  let lastFraction = 0;
  let lastSentAt = -Infinity;
  return (stage: ProgressMessage['stage'], fraction: number) => {
    const now = performance.now();
    if (now - lastSentAt < PROGRESS_INTERVAL_MS) return;
    lastSentAt = now;
    lastFraction = Math.max(lastFraction, Math.min(1, fraction));
    emit({ type: 'progress', stage, fraction: lastFraction });
  };
}

export async function handleAnalyze(request: AnalyzeRequest, emit: Emit): Promise<void> {
  const reportProgress = createProgressReporter(emit);
  let final: ResultMessage | ErrorMessage;
  try {
    reportProgress('reading', 0);
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    reportProgress('extracting', 0.3);
    const text = request.format === 'epub' ? extractEpubText(bytes) : decodeText(bytes);
    reportProgress('counting', 0.6);
    const result = countWords(text, request.file.name);
    final = result.totalWords === 0 ? { type: 'error', code: 'empty' } : { type: 'result', result };
  } catch (error) {
    // Guarantee 5: every failure becomes a message; nothing is thrown to the main thread.
    final = { type: 'error', code: error instanceof EpubError ? error.code : 'corrupted' };
  }
  // Exactly one final message, sent outside the try so it can never be followed by another.
  emit(final);
}
