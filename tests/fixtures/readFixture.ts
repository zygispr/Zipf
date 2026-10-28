// Node-side fixture helpers for unit, contract, perf, and e2e tests.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface ExpectedCounts {
  totalWords: number;
  distinctWords: number;
  entries: [word: string, count: number][];
}

export function fixturePath(name: string): string {
  return fileURLToPath(new URL(name, import.meta.url));
}

export function readFixture(name: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(readFileSync(fixturePath(name)));
}

export function readFixtureText(name: string): string {
  return readFileSync(fixturePath(name), 'utf8');
}

export function fixtureFile(name: string): File {
  return new File([readFixture(name)], name);
}

/** Hand-verified counts for known-counts.txt / known-counts.epub. */
export function readExpectedCounts(): ExpectedCounts {
  return JSON.parse(readFixtureText('known-counts.json')) as ExpectedCounts;
}
