import { isLikelyEnglish } from './stopWords';
import { forEachToken } from './tokenize';
import type { FrequencyResult } from './types';

const collator = new Intl.Collator('en');

/** Count desc, then word asc (FR-007). Code-point order breaks the rare collator tie. */
function compareEntries(a: [string, number], b: [string, number]): number {
  return b[1] - a[1] || collator.compare(a[0], b[0]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
}

export function countWords(text: string, bookName: string): FrequencyResult {
  const counts = new Map<string, number>();
  let totalWords = 0;
  forEachToken(text, (word) => {
    counts.set(word, (counts.get(word) ?? 0) + 1);
    totalWords++;
  });
  const entries = [...counts].sort(compareEntries);
  return {
    bookName,
    totalWords,
    distinctWords: entries.length,
    entries,
    isLikelyEnglish: isLikelyEnglish(entries, totalWords),
  };
}
