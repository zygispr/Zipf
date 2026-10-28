// Search lookup for SearchBox (FR-021, data model derived view).
import { normalizeWord } from './tokenize';
import type { WordEntry } from './types';

/** Built once per view, so each keystroke is a single `Map` lookup. */
export function createWordIndex(entries: readonly WordEntry[]): Map<string, WordEntry> {
  return new Map(entries.map((entry) => [entry.word, entry]));
}

/** Normalizes the query like counted words, so "Don’t" finds "don't". */
export function findWord(index: ReadonlyMap<string, WordEntry>, query: string): WordEntry | null {
  const word = normalizeWord(query.trim());
  if (!word) return null;
  return index.get(word) ?? null;
}
