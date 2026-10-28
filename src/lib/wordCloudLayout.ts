// Word cloud sizing (research R7). Placement runs in a worker (see placeWords.ts); this module stays
// on the main thread, so it must not import d3-cloud.
import { scaleSqrt } from 'd3-scale';
import type { WordEntry } from './types';

/** A word ready for placement: its font size in px comes from √count. */
export interface SizedWord extends WordEntry {
  size: number;
}

export interface PlacedWord extends SizedWord {
  /** Center of the word, relative to the middle of the cloud. */
  x: number;
  y: number;
  rotate: 0 | 90;
}

const MAX_WORDS = 100;
const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 72;
export const WORD_CLOUD_FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const WORD_CLOUD_FONT_WEIGHT = 700;

/** Font size from √count, so a word's area grows with its count (FR-014). */
export function fontSizeScale(entries: readonly WordEntry[], maxSize = MAX_FONT_SIZE) {
  const counts = entries.map((entry) => entry.count);
  return scaleSqrt()
    .domain([Math.min(...counts), Math.max(...counts)])
    .range([MIN_FONT_SIZE, maxSize]);
}

/** The first 100 words with their font sizes, keeping the largest in proportion on narrow screens. */
export function sizeWords(entries: readonly WordEntry[], width: number): SizedWord[] {
  const words = entries.slice(0, MAX_WORDS);
  const scale = fontSizeScale(words, Math.min(MAX_FONT_SIZE, Math.max(28, width / 8)));
  return words.map((entry) => ({ ...entry, size: scale(entry.count) }));
}
