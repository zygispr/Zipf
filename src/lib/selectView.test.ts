import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW_SETTINGS, type FrequencyResult } from './types';
import { formatCount, formatPercent, selectView } from './selectView';

const result: FrequencyResult = {
  bookName: 'tiny.txt',
  totalWords: 8,
  distinctWords: 3,
  entries: [
    ['the', 4],
    ['cat', 3],
    ['hat', 1],
  ],
  isLikelyEnglish: true,
};

describe('selectView', () => {
  it('maps tuples to word entries with rank and percent', () => {
    expect(selectView(result, DEFAULT_VIEW_SETTINGS).entries).toEqual([
      { word: 'the', count: 4, rank: 1, percent: 50 },
      { word: 'cat', count: 3, rank: 2, percent: 37.5 },
      { word: 'hat', count: 1, rank: 3, percent: 12.5 },
    ]);
  });

  it('does not mutate the result', () => {
    const frozen = Object.freeze({
      ...result,
      entries: Object.freeze(result.entries.map((entry) => Object.freeze(entry))),
    }) as FrequencyResult;
    expect(() => selectView(frozen, DEFAULT_VIEW_SETTINGS)).not.toThrow();
  });
});

describe('formatPercent', () => {
  it('formats with two decimals', () => {
    expect(formatPercent(5.1234)).toBe('5.12');
    expect(formatPercent(0)).toBe('0.00');
    expect(formatPercent(100)).toBe('100.00');
  });
});

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(1_234_567)).toBe('1,234,567');
    expect(formatCount(7)).toBe('7');
  });
});
