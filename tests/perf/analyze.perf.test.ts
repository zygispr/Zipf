// Performance budget (constitution V, research R10): analyzing 1M words must take ≤ 400 ms
// (median of 5) on reference hardware. CI sets PERF_BUDGET_MS=800 for slower shared runners.
import { expect, it } from 'vitest';
import { countWords } from '../../src/lib/countWords';
import { generateZipfText } from '../fixtures/generateText';

const WORDS = 1_000_000;
const RUNS = 5;
const budget = Number(process.env.PERF_BUDGET_MS ?? 400);

it(`analyzes ${String(WORDS)} words with a median ≤ ${String(budget)} ms`, () => {
  const text = generateZipfText(WORDS);
  countWords(text, 'warm-up');

  const timings: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    const started = performance.now();
    const result = countWords(text, 'bench');
    timings.push(performance.now() - started);
    expect(result.totalWords).toBe(WORDS);
  }
  const median = [...timings].sort((a, b) => a - b)[Math.floor(RUNS / 2)] ?? Infinity;
  console.log(
    `countWords(${String(WORDS)} words): median ${median.toFixed(1)} ms, runs ` +
      `[${timings.map((t) => t.toFixed(1)).join(', ')}] ms, budget ${String(budget)} ms`,
  );
  expect(median).toBeLessThanOrEqual(budget);
});
