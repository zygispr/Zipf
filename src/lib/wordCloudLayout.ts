// Word cloud layout with d3-cloud (research R7). Runs off render, in an effect, and can be cancelled.
import cloud from 'd3-cloud';
import { scaleSqrt } from 'd3-scale';
import type { WordEntry } from './types';

export interface PlacedWord extends WordEntry {
  /** Center of the word, relative to the middle of the cloud. */
  x: number;
  y: number;
  /** Font size in px. */
  size: number;
  rotate: 0 | 90;
}

export interface WordCloudLayout {
  layout: Promise<PlacedWord[]>;
  cancel: () => void;
}

const MAX_WORDS = 100;
const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 72;
const ROTATED_SHARE = 0.25;
const SEED = 42;
export const WORD_CLOUD_FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const WORD_CLOUD_FONT_WEIGHT = 700;

type CloudWord = WordEntry & cloud.Word;

/** Font size from √count, so a word's area grows with its count (FR-014). */
export function fontSizeScale(entries: readonly WordEntry[], maxSize = MAX_FONT_SIZE) {
  const counts = entries.map((entry) => entry.count);
  return scaleSqrt()
    .domain([Math.min(...counts), Math.max(...counts)])
    .range([MIN_FONT_SIZE, maxSize]);
}

/** mulberry32: seeded, so the same book always gets the same cloud. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Lays out at most 100 words. `createCanvas` replaces d3-cloud's text-measuring canvas (tests
 * pass a fake one so this runs in Node). Words that don't fit are left out.
 */
export function computeWordCloudLayout(
  entries: readonly WordEntry[],
  { width, height }: { width: number; height: number },
  createCanvas?: () => HTMLCanvasElement,
): WordCloudLayout {
  const words = entries.slice(0, MAX_WORDS);
  // Keep the largest words in proportion on narrow screens.
  const scale = fontSizeScale(words, Math.min(MAX_FONT_SIZE, Math.max(28, width / 8)));
  const random = seededRandom(SEED);
  const layout = cloud<CloudWord>()
    .size([width, height])
    .words(words.map((entry) => ({ ...entry, text: entry.word, size: scale(entry.count) })))
    .padding(2)
    .rotate(() => (random() < ROTATED_SHARE ? 90 : 0))
    .font(WORD_CLOUD_FONT_FAMILY)
    .fontWeight(WORD_CLOUD_FONT_WEIGHT)
    .fontSize((word) => word.size ?? MIN_FONT_SIZE)
    .random(random)
    .timeInterval(10);
  if (createCanvas) layout.canvas(createCanvas);

  const placed = new Promise<PlacedWord[]>((resolve) => {
    layout.on('end', (tags) => {
      resolve(
        tags.map(({ word, count, rank, percent, x, y, size, rotate }) => ({
          word,
          count,
          rank,
          percent,
          x: x ?? 0,
          y: y ?? 0,
          size: size ?? MIN_FONT_SIZE,
          rotate: rotate === 90 ? 90 : 0,
        })),
      );
    });
  });
  layout.start();
  return {
    layout: placed,
    cancel: () => {
      layout.stop();
    },
  };
}
