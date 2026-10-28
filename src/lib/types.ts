// Source: specs/001-book-word-frequency/data-model.md

export type BookFormat = 'txt' | 'epub';

/** One distinct normalized word in the current (filtered or unfiltered) view. */
export interface WordEntry {
  word: string;
  count: number;
  /** 1-based position in the current ordering. */
  rank: number;
  /** `count / totalWords × 100` of the current view. */
  percent: number;
}

/** What the worker returns for one book. Never changes after creation. */
export interface FrequencyResult {
  bookName: string;
  totalWords: number;
  distinctWords: number;
  /** Entries sorted count desc, then word asc; rank = index + 1. */
  entries: [word: string, count: number][];
  isLikelyEnglish: boolean;
}

export type VisualizationType = 'bar' | 'cloud' | 'zipf';

export type TopN = 10 | 25 | 50 | 100;

export interface ViewSettings {
  visualization: VisualizationType;
  topN: TopN;
  hideCommonWords: boolean;
}

export const DEFAULT_VIEW_SETTINGS: Readonly<ViewSettings> = {
  visualization: 'bar',
  topN: 25,
  hideCommonWords: false,
};

export type AnalysisErrorCode = 'unsupported' | 'too-large' | 'empty' | 'corrupted' | 'protected';

/** 50 MB upload limit (FR-003). */
export const MAX_FILE_BYTES = 52_428_800;

/** 200 MB total uncompressed EPUB content, the zip-bomb guard (research R4). */
export const MAX_UNCOMPRESSED_BYTES = 209_715_200;
