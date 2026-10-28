// US4 end-to-end checks (quickstart scenario 7).
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { ENGLISH_STOP_WORDS } from '../../src/lib/stopWords';
import { fixturePath, readExpectedCounts } from '../fixtures/readFixture';
import { uploadFile } from './helpers';

const expected = readExpectedCounts();

async function download(page: Page) {
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download results' }).click(),
  ]);
  const path = await file.path();
  return { filename: file.suggestedFilename(), content: await readFile(path, 'utf8') };
}

/** The CSV every word in known-counts.txt should produce, ranked over `entries`. */
function expectedCsv(entries: [string, number][]): string {
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const rows = entries.map(
    ([word, count], index) =>
      `${String(index + 1)},${word},${String(count)},${((count / total) * 100).toFixed(4)}`,
  );
  return `﻿${['rank,word,count,percent', ...rows].join('\r\n')}\r\n`;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await uploadFile(page, fixturePath('known-counts.txt'));
  await expect(page.getByRole('heading', { level: 2, name: 'known-counts.txt' })).toBeVisible();
});

test('downloads every word as CSV, matching the counts', async ({ page }) => {
  const { filename, content } = await download(page);
  expect(filename).toBe('known-counts-word-frequencies.csv');
  expect(content).toBe(expectedCsv(expected.entries));
});

test('with common words hidden, the download leaves them out', async ({ page }) => {
  await page.getByRole('switch', { name: 'Hide common words' }).click();
  const { content } = await download(page);
  const kept = expected.entries.filter(([word]) => !ENGLISH_STOP_WORDS.has(word));
  expect(content).toBe(expectedCsv(kept));
  const words = content.split('\r\n').map((line) => line.split(',')[1]);
  expect(words).not.toContain('the');
  expect(words).not.toContain("don't");
});
