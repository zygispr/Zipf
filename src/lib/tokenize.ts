// Tokenization and normalization rules (research R5, FR-008–FR-010).

/** A letter, then letters/marks, optionally joined by internal apostrophes or hyphens. */
const WORD_PATTERN = /\p{L}[\p{L}\p{M}]*(?:['’\-‐][\p{L}\p{M}]+)*/gu;

/**
 * The single normalization used for counting, stop words, and search: NFC, lowercase, and
 * curly apostrophe (U+2019) → `'`, Unicode hyphen (U+2010) → `-`.
 */
export function normalizeWord(word: string): string {
  return word.normalize('NFC').toLowerCase().replaceAll('’', "'").replaceAll('‐', '-');
}

/** Calls `callback` with each normalized token, without building a token array. */
export function forEachToken(text: string, callback: (token: string) => void): void {
  // Books repeat a small vocabulary, so cache the normalization of each raw spelling.
  const normalized = new Map<string, string>();
  for (const [raw] of text.matchAll(WORD_PATTERN)) {
    let token = normalized.get(raw);
    if (token === undefined) {
      token = normalizeWord(raw);
      normalized.set(raw, token);
    }
    callback(token);
  }
}

export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  forEachToken(text, (token) => tokens.push(token));
  return tokens;
}
