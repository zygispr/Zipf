// Word cloud placement with d3-cloud (research R7). Runs in the word cloud worker: drawing every
// word to a canvas and building its collision mask takes over 100 ms on a throttled phone, which
// would freeze the view-switch animation on the main thread.
import cloud from 'd3-cloud';
import {
  WORD_CLOUD_FONT_FAMILY,
  WORD_CLOUD_FONT_WEIGHT,
  type PlacedWord,
  type SizedWord,
} from './wordCloudLayout';

const ROTATED_SHARE = 0.25;
const SEED = 42;

type CloudWord = SizedWord & cloud.Word;

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
 * Places sized words. `createCanvas` measures text: an OffscreenCanvas in the worker, a fake one in
 * tests. Words that don't fit are left out.
 */
export function placeWords(
  words: readonly SizedWord[],
  { width, height }: { width: number; height: number },
  createCanvas: () => HTMLCanvasElement,
): { layout: Promise<PlacedWord[]>; cancel: () => void } {
  const random = seededRandom(SEED);
  const layout = cloud<CloudWord>()
    .size([width, height])
    .canvas(createCanvas)
    .words(words.map((word) => ({ ...word, text: word.word })))
    .padding(2)
    .rotate(() => (random() < ROTATED_SHARE ? 90 : 0))
    .font(WORD_CLOUD_FONT_FAMILY)
    .fontWeight(WORD_CLOUD_FONT_WEIGHT)
    .fontSize((word) => word.size)
    .random(random)
    .timeInterval(10);

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
          size,
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
