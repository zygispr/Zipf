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

function resultWith(distinct: number): FrequencyResult {
  const entries: [string, number][] = Array.from({ length: distinct }, (_, i) => [
    `w${String(i + 1)}`,
    distinct - i,
  ]);
  return {
    bookName: 'many.txt',
    totalWords: entries.reduce((sum, [, count]) => sum + count, 0),
    distinctWords: distinct,
    entries,
    isLikelyEnglish: true,
  };
}

describe('selectView top', () => {
  it('is the first topN entries', () => {
    const view = selectView(resultWith(200), DEFAULT_VIEW_SETTINGS);
    expect(view.top).toEqual(view.entries.slice(0, 25));
    expect(selectView(resultWith(200), { ...DEFAULT_VIEW_SETTINGS, topN: 10 }).top).toHaveLength(
      10,
    );
  });

  it('has fewer entries when the book has fewer distinct words, with no placeholders', () => {
    expect(selectView(result, { ...DEFAULT_VIEW_SETTINGS, topN: 100 }).top).toEqual(
      selectView(result, DEFAULT_VIEW_SETTINGS).entries,
    );
  });
});

describe('selectView zipfPoints', () => {
  it('includes every rank when there are at most 100', () => {
    const { zipfPoints } = selectView(resultWith(50), DEFAULT_VIEW_SETTINGS);
    expect(zipfPoints.map((p) => p.rank)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it('samples large vocabularies: ranks ≤ 100, then log-spaced, at most 1,000 points', () => {
    const big = resultWith(50_000);
    const { zipfPoints } = selectView(big, DEFAULT_VIEW_SETTINGS);
    const ranks = zipfPoints.map((p) => p.rank);
    expect(ranks.slice(0, 100)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(zipfPoints.length).toBeLessThanOrEqual(1000);
    expect(zipfPoints.length).toBeGreaterThan(950);
    expect(ranks.at(-1)).toBe(50_000);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThan(ranks[i - 1] ?? Infinity);
    }
    // Log spacing: the ratio between neighbours stays small and roughly constant.
    for (let i = 101; i < ranks.length; i++) {
      expect((ranks[i] ?? 0) / (ranks[i - 1] ?? 1)).toBeLessThan(1.02);
    }
    for (const { rank, count } of zipfPoints) {
      expect(count).toBe(big.entries[rank - 1]?.[1]);
    }
  });
});

describe('selectView idealAt', () => {
  it('is the top count divided by the rank', () => {
    const { idealAt } = selectView(result, DEFAULT_VIEW_SETTINGS);
    expect(idealAt(1)).toBe(4);
    expect(idealAt(4)).toBe(1);
    expect(idealAt(8)).toBe(0.5);
  });
});

describe('selectView hideCommonWords', () => {
  const withStopWords: FrequencyResult = {
    bookName: 'stop.txt',
    totalWords: 10,
    distinctWords: 4,
    entries: [
      ['the', 4],
      ['cat', 3],
      ['and', 2],
      ['hat', 1],
    ],
    isLikelyEnglish: true,
  };
  const hidden = { ...DEFAULT_VIEW_SETTINGS, hideCommonWords: true };

  it('removes stop words and recomputes rank and percent over the filtered total', () => {
    expect(selectView(withStopWords, hidden).entries).toEqual([
      { word: 'cat', count: 3, rank: 1, percent: 75 },
      { word: 'hat', count: 1, rank: 2, percent: 25 },
    ]);
  });

  it('builds top and zipfPoints from the filtered entries', () => {
    const view = selectView(withStopWords, { ...hidden, topN: 10 });
    expect(view.top.map((entry) => entry.word)).toEqual(['cat', 'hat']);
    expect(view.zipfPoints).toEqual([
      { rank: 1, count: 3 },
      { rank: 2, count: 1 },
    ]);
    expect(view.idealAt(1)).toBe(3);
  });

  it('lists the words it hid, and only those in the book', () => {
    expect([...selectView(withStopWords, hidden).hiddenWords]).toEqual(['the', 'and']);
    expect(selectView(withStopWords, hidden).hiddenWords.has('whom')).toBe(false);
    expect(selectView(withStopWords, DEFAULT_VIEW_SETTINGS).hiddenWords.size).toBe(0);
  });

  it('equals the unfiltered view when off', () => {
    const view = selectView(withStopWords, DEFAULT_VIEW_SETTINGS);
    expect(view.entries.map((entry) => entry.word)).toEqual(['the', 'cat', 'and', 'hat']);
    expect(view.entries[0]).toEqual({ word: 'the', count: 4, rank: 1, percent: 40 });
    expect(view.top).toEqual(view.entries);
  });

  it('gives an empty view when every word is a stop word', () => {
    const onlyStopWords: FrequencyResult = {
      ...withStopWords,
      entries: [['the', 1]],
      totalWords: 1,
      distinctWords: 1,
    };
    const view = selectView(onlyStopWords, hidden);
    expect(view.entries).toEqual([]);
    expect(view.top).toEqual([]);
    expect(view.zipfPoints).toEqual([]);
  });
});
