// Contract tests for specs/001-book-word-frequency/contracts/worker-messages.md.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BookFormat } from '../../src/lib/types';
import type { WorkerMessage } from '../../src/worker/messages';
import { handleAnalyze } from '../../src/worker/handleAnalyze';
import { fixtureFile, readExpectedCounts } from '../fixtures/readFixture';

const decodeFailure = vi.hoisted(() => ({ enabled: false }));

vi.mock('../../src/lib/decodeText', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/decodeText')>();
  return {
    decodeText: (bytes: Uint8Array) => {
      if (decodeFailure.enabled) throw new Error('forced failure');
      return actual.decodeText(bytes);
    },
  };
});

interface Recorded {
  message: WorkerMessage;
  at: number;
}

async function analyze(name: string, format: BookFormat): Promise<Recorded[]> {
  const recorded: Recorded[] = [];
  await handleAnalyze({ type: 'analyze', file: fixtureFile(name), format }, (message) => {
    recorded.push({ message, at: performance.now() });
  });
  // Guarantee 1: nothing may arrive after the final message, even later.
  const countAtFinish = recorded.length;
  await new Promise((resolve) => setTimeout(resolve, 60));
  expect(recorded).toHaveLength(countAtFinish);
  return recorded;
}

/** Checks guarantees 1, 2, 3, and 6, and returns the final message. */
function expectProtocol(recorded: Recorded[]): Exclude<WorkerMessage, { type: 'progress' }> {
  const messages = recorded.map((r) => r.message);
  const finals = messages.filter((m) => m.type !== 'progress');
  // (1) zero or more progress messages, then exactly one result or error, last.
  expect(finals).toHaveLength(1);
  const final = finals[0];
  if (!final) throw new Error('no final message');
  expect(messages.at(-1)).toBe(final);

  // (2) fraction stays within 0..1, never decreases, at most one message per 50 ms.
  const progress = recorded.filter((r) => r.message.type === 'progress');
  let previous = { fraction: 0, at: -Infinity };
  for (const { message, at } of progress) {
    if (message.type !== 'progress') continue;
    expect(message.fraction).toBeGreaterThanOrEqual(0);
    expect(message.fraction).toBeLessThanOrEqual(1);
    expect(message.fraction).toBeGreaterThanOrEqual(previous.fraction);
    expect(at - previous.at).toBeGreaterThanOrEqual(49);
    previous = { fraction: message.fraction, at };
  }

  if (final.type === 'result') {
    // (3) sorted by count desc then word asc, and totalWords === sum(counts).
    const { entries, totalWords, distinctWords } = final.result;
    const collator = new Intl.Collator('en');
    for (let i = 1; i < entries.length; i++) {
      const [prevWord, prevCount] = entries[i - 1] ?? ['', 0];
      const [word, count] = entries[i] ?? ['', 0];
      expect(
        prevCount > count || (prevCount === count && collator.compare(prevWord, word) < 0),
      ).toBe(true);
    }
    expect(totalWords).toBe(entries.reduce((sum, [, count]) => sum + count, 0));
    expect(distinctWords).toBe(entries.length);
  } else {
    // (6) the worker never produces main-thread-only codes.
    expect(['empty', 'corrupted', 'protected']).toContain(final.code);
  }
  return final;
}

afterEach(() => {
  decodeFailure.enabled = false;
});

describe('analysis worker protocol', () => {
  const expected = readExpectedCounts();

  it('analyzes known-counts.txt', async () => {
    const final = expectProtocol(await analyze('known-counts.txt', 'txt'));
    expect(final).toMatchObject({
      type: 'result',
      result: {
        bookName: 'known-counts.txt',
        totalWords: expected.totalWords,
        distinctWords: expected.distinctWords,
        entries: expected.entries,
      },
    });
  });

  it('analyzes known-counts.epub to the same entries as the .txt', async () => {
    const final = expectProtocol(await analyze('known-counts.epub', 'epub'));
    expect(final).toMatchObject({
      type: 'result',
      result: { bookName: 'known-counts.epub', entries: expected.entries },
    });
  });

  it.each([
    ['empty.txt', 'txt', 'empty'],
    ['numbers-only.txt', 'txt', 'empty'],
    ['corrupted.epub', 'epub', 'corrupted'],
    ['zip-bomb.epub', 'epub', 'corrupted'],
    ['drm.epub', 'epub', 'protected'],
  ] as const)('reports %s as %s → %s', async (name, format, code) => {
    expect(expectProtocol(await analyze(name, format))).toEqual({ type: 'error', code });
  });

  it('reports an unexpected internal exception as corrupted (guarantee 5)', async () => {
    decodeFailure.enabled = true;
    expect(expectProtocol(await analyze('known-counts.txt', 'txt'))).toEqual({
      type: 'error',
      code: 'corrupted',
    });
  });
});
