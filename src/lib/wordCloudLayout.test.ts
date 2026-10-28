import { describe, expect, it } from 'vitest';
import type { WordEntry } from './types';
import { computeWordCloudLayout, fontSizeScale } from './wordCloudLayout';

const entries = (n: number): WordEntry[] =>
  Array.from({ length: n }, (_, i) => ({
    word: `word${String(i + 1)}`,
    count: 1000 - i * 5,
    rank: i + 1,
    percent: 1,
  }));

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

describe('fontSizeScale', () => {
  it('maps the smallest count to 14 px and the largest to 72 px', () => {
    const scale = fontSizeScale(entries(10));
    expect(scale(1000)).toBeCloseTo(72);
    expect(scale(955)).toBeCloseTo(14);
  });

  it('is a square-root scale', () => {
    const scale = fontSizeScale([
      { word: 'a', count: 100, rank: 1, percent: 1 },
      { word: 'b', count: 0, rank: 2, percent: 0 },
    ]);
    expect(scale(25)).toBeCloseTo(14 + (72 - 14) * 0.5);
  });
});

describe('computeWordCloudLayout', () => {
  it('positions every word with a size, rotation, and its entry data', async () => {
    const input = entries(20);
    const { layout } = computeWordCloudLayout(input, { width: 1200, height: 900 }, fakeCanvas);
    const words = await layout;
    expect(words).toHaveLength(20);
    const scale = fontSizeScale(input);
    for (const placed of words) {
      const entry = input.find((e) => e.word === placed.word);
      expect(entry).toBeDefined();
      expect(placed).toMatchObject({ count: entry?.count, rank: entry?.rank });
      // d3-cloud truncates font sizes to whole pixels.
      expect(placed.size).toBe(Math.trunc(scale(placed.count)));
      expect([0, 90]).toContain(placed.rotate);
      expect(Number.isFinite(placed.x) && Number.isFinite(placed.y)).toBe(true);
    }
  });

  it('lays out at most 100 words', async () => {
    const { layout } = computeWordCloudLayout(
      entries(150),
      { width: 2000, height: 2000 },
      fakeCanvas,
    );
    expect((await layout).length).toBeLessThanOrEqual(100);
  });

  it('is stable: the same input gives the same layout', async () => {
    const run = () =>
      computeWordCloudLayout(entries(15), { width: 600, height: 400 }, fakeCanvas).layout;
    expect(await run()).toEqual(await run());
  });

  it('can be cancelled', () => {
    const { cancel } = computeWordCloudLayout(entries(15), { width: 600, height: 400 }, fakeCanvas);
    expect(() => {
      cancel();
    }).not.toThrow();
  });
});
