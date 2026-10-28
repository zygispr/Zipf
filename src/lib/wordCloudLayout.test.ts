import { describe, expect, it } from 'vitest';
import type { WordEntry } from './types';
import { fontSizeScale, sizeWords } from './wordCloudLayout';

const entries = (n: number): WordEntry[] =>
  Array.from({ length: n }, (_, i) => ({
    word: `word${String(i + 1)}`,
    count: 1000 - i * 5,
    rank: i + 1,
    percent: 1,
  }));

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

describe('sizeWords', () => {
  it('keeps at most 100 words, in order, with a font size from √count', () => {
    const input = entries(150);
    const words = sizeWords(input, 1200);
    expect(words).toHaveLength(100);
    expect(words.map((word) => word.word)).toEqual(input.slice(0, 100).map((e) => e.word));
    const scale = fontSizeScale(input.slice(0, 100));
    for (const word of words) expect(word.size).toBeCloseTo(scale(word.count));
    expect(words[0]).toMatchObject({ word: 'word1', count: 1000, rank: 1, percent: 1 });
  });

  it('shrinks the largest words on narrow screens, but not below 28 px', () => {
    expect(sizeWords(entries(10), 1200)[0]?.size).toBeCloseTo(72);
    expect(sizeWords(entries(10), 320)[0]?.size).toBeCloseTo(40);
    expect(sizeWords(entries(10), 100)[0]?.size).toBeCloseTo(28);
  });
});
