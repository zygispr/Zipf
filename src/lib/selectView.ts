import type { FrequencyResult, ViewSettings, WordEntry } from './types';

export interface View {
  entries: WordEntry[];
}

/** Derives what the results screen shows. Pure, so `useMemo` can cache it. */
export function selectView(result: FrequencyResult, _settings: ViewSettings): View {
  const { totalWords } = result;
  return {
    entries: result.entries.map(([word, count], index) => ({
      word,
      count,
      rank: index + 1,
      percent: (count / totalWords) * 100,
    })),
  };
}

export function formatPercent(percent: number): string {
  return percent.toFixed(2);
}

const countFormat = new Intl.NumberFormat('en');

export function formatCount(count: number): string {
  return countFormat.format(count);
}
