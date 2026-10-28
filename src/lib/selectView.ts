import { ENGLISH_STOP_WORDS } from './stopWords';
import type { FrequencyResult, ViewSettings, WordEntry } from './types';

export interface ZipfPoint {
  rank: number;
  count: number;
}

export interface View {
  entries: WordEntry[];
  /** The first `topN` entries, for the bar chart and the word cloud. */
  top: WordEntry[];
  /** Sampled `{ rank, count }` points for the Zipf chart (research R7). */
  zipfPoints: ZipfPoint[];
  /** The ideal Zipf curve: `count(1) / rank`. */
  idealAt: (rank: number) => number;
  /** Words in the book that "Hide common words" removed, so search can say why it misses them. */
  hiddenWords: ReadonlySet<string>;
}

export type ViewOptions = Pick<ViewSettings, 'topN' | 'hideCommonWords'>;

const EVERY_RANK_UP_TO = 100;
const MAX_ZIPF_POINTS = 1000;

/**
 * Every rank up to 100, then log-spaced ranks up to the last one, at most 1,000 in all. On a log
 * axis this looks the same as plotting every word, and keeps the SVG small (research R7).
 */
function sampleZipfRanks(lastRank: number): number[] {
  const ranks: number[] = [];
  for (let rank = 1; rank <= Math.min(EVERY_RANK_UP_TO, lastRank); rank++) ranks.push(rank);
  if (lastRank <= EVERY_RANK_UP_TO) return ranks;

  const samples = MAX_ZIPF_POINTS - EVERY_RANK_UP_TO;
  const from = Math.log(EVERY_RANK_UP_TO + 1);
  const to = Math.log(lastRank);
  for (let i = 0; i < samples; i++) {
    const rank = Math.round(Math.exp(from + ((to - from) * i) / (samples - 1)));
    if (rank > (ranks.at(-1) ?? 0) && rank <= lastRank) ranks.push(rank);
  }
  if (ranks.at(-1) !== lastRank) {
    if (ranks.length >= MAX_ZIPF_POINTS) ranks.pop();
    ranks.push(lastRank);
  }
  return ranks;
}

/**
 * Derives what the results screen shows. Pure, so `useMemo` can cache it. Hiding common words
 * re-ranks the rest and computes percentages over the words that remain (data model).
 */
export function selectView(result: FrequencyResult, { topN, hideCommonWords }: ViewOptions): View {
  const hiddenWords = new Set<string>();
  const kept = hideCommonWords
    ? result.entries.filter(([word]) => {
        if (!ENGLISH_STOP_WORDS.has(word)) return true;
        hiddenWords.add(word);
        return false;
      })
    : result.entries;
  const totalWords = hideCommonWords
    ? kept.reduce((sum, [, count]) => sum + count, 0)
    : result.totalWords;
  const entries = kept.map(([word, count], index) => ({
    word,
    count,
    rank: index + 1,
    percent: (count / totalWords) * 100,
  }));
  const topCount = entries[0]?.count ?? 0;
  return {
    entries,
    top: entries.slice(0, topN),
    zipfPoints: sampleZipfRanks(entries.length).map((rank) => ({
      rank,
      count: entries[rank - 1]?.count ?? 0,
    })),
    idealAt: (rank) => topCount / rank,
    hiddenWords,
  };
}

export function formatPercent(percent: number): string {
  return percent.toFixed(2);
}

const countFormat = new Intl.NumberFormat('en');

export function formatCount(count: number): string {
  return countFormat.format(count);
}
