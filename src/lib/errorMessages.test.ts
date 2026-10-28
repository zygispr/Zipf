import { describe, expect, it } from 'vitest';
import type { AnalysisErrorCode } from './types';
import { ERROR_MESSAGES } from './errorMessages';

const ALL_CODES: AnalysisErrorCode[] = [
  'unsupported',
  'too-large',
  'empty',
  'corrupted',
  'protected',
];

describe('ERROR_MESSAGES', () => {
  it.each(ALL_CODES)('has a non-empty message for %s', (code) => {
    expect(ERROR_MESSAGES[code].trim()).not.toBe('');
  });

  it('uses the exact plain-language messages from the data model (FR-025)', () => {
    expect(ERROR_MESSAGES).toEqual({
      unsupported: 'We can read .txt and .epub books. Please choose one of those.',
      'too-large': 'This file is larger than 50 MB. Please choose a smaller book.',
      empty: "We couldn't find any readable words in this book.",
      corrupted: "This file couldn't be read. It may be damaged. Try another copy.",
      protected: "This book is copy-protected (DRM), so its text can't be read.",
    });
  });
});
