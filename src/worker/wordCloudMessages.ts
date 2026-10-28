// Main thread ↔ word cloud worker protocol. One request per worker; the worker answers once.
import type { PlacedWord, SizedWord } from '../lib/wordCloudLayout';

export interface WordCloudRequest {
  words: SizedWord[];
  width: number;
  height: number;
}

export type WordCloudResponse = { type: 'layout'; words: PlacedWord[] } | { type: 'error' };
