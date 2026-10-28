import { MAX_FILE_BYTES, type AnalysisErrorCode } from './types';

const MAX_FILE_MB = MAX_FILE_BYTES / 1024 / 1024;

/** Plain-language message shown for each analysis error (data-model AnalysisError, FR-025). */
export const ERROR_MESSAGES: Readonly<Record<AnalysisErrorCode, string>> = {
  unsupported: 'We can read .txt and .epub books. Please choose one of those.',
  'too-large': `This file is larger than ${String(MAX_FILE_MB)} MB. Please choose a smaller book.`,
  empty: "We couldn't find any readable words in this book.",
  corrupted: "This file couldn't be read. It may be damaged. Try another copy.",
  protected: "This book is copy-protected (DRM), so its text can't be read.",
};
