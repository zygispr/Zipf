import { describe, expect, it } from 'vitest';
import { placeWords } from './placeWords';
import { sizeWords, type SizedWord } from './wordCloudLayout';

const sized = (n: number, width = 1200): SizedWord[] =>
  sizeWords(
    Array.from({ length: n }, (_, i) => ({
      word: `word${String(i + 1)}`,
      count: 1000 - i * 5,
      rank: i + 1,
      percent: 1,
    })),
    width,
  );

/**
 * A stand-in for <canvas>: text is measured by its length, and every other pixel row is "ink".
 * Like the gaps between real glyph strokes, the empty rows let d3-cloud pack words that overlap the
 * cloud's bounding box, while words still collide.
 */
function fakeCanvas(): HTMLCanvasElement {
  const context = {
    font: '',
    fillStyle: '',
    textAlign: '',
    lineWidth: 0,
    clearRect: () => undefined,
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    rotate: () => undefined,
    fillText: () => undefined,
    strokeText: () => undefined,
    measureText: (text: string) => ({ width: text.length * 8 }),
    getImageData: (_x: number, _y: number, width: number, height: number) => {
      const data = new Uint8ClampedArray(Math.max(1, width * height) * 4);
      for (let row = 0; row < height; row += 2)
        data.fill(255, row * width * 4, (row + 1) * width * 4);
      return { data };
    },
  };
  return { width: 1, height: 1, getContext: () => context } as unknown as HTMLCanvasElement;
}

describe('placeWords', () => {
  it('positions every word with its size, a rotation, and its entry data', async () => {
    const input = sized(20);
    const { layout } = placeWords(input, { width: 1200, height: 900 }, fakeCanvas);
    const words = await layout;
    expect(words).toHaveLength(20);
    for (const placed of words) {
      const entry = input.find((e) => e.word === placed.word);
      expect(entry).toBeDefined();
      expect(placed).toMatchObject({ count: entry?.count, rank: entry?.rank, percent: 1 });
      // d3-cloud truncates font sizes to whole pixels.
      expect(placed.size).toBe(Math.trunc(entry?.size ?? 0));
      expect([0, 90]).toContain(placed.rotate);
      expect(Number.isFinite(placed.x) && Number.isFinite(placed.y)).toBe(true);
    }
  });

  it('is stable: the same input gives the same layout', async () => {
    const run = () => placeWords(sized(15, 600), { width: 600, height: 400 }, fakeCanvas).layout;
    expect(await run()).toEqual(await run());
  });

  it('can be cancelled', () => {
    const { cancel } = placeWords(sized(15, 600), { width: 600, height: 400 }, fakeCanvas);
    expect(() => {
      cancel();
    }).not.toThrow();
  });
});
