import { MAX_FILE_BYTES, type AnalysisErrorCode, type BookFormat } from './types';

export type FileValidation =
  | { ok: true; format: BookFormat }
  | { ok: false; code: Extract<AnalysisErrorCode, 'unsupported' | 'too-large' | 'empty'> };

/** Main-thread checks before the worker starts (data model BookFile, FR-002, FR-003). */
export function validateFile({ name, size }: { name: string; size: number }): FileValidation {
  const extension = /\.([^.]+)$/.exec(name)?.[1]?.toLowerCase();
  if (extension !== 'txt' && extension !== 'epub') return { ok: false, code: 'unsupported' };
  if (size > MAX_FILE_BYTES) return { ok: false, code: 'too-large' };
  if (size <= 0) return { ok: false, code: 'empty' };
  return { ok: true, format: extension };
}
