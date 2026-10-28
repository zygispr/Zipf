// US1 end-to-end flows (quickstart scenarios 1, 8, 9).
import { writeFile } from 'node:fs/promises';
import { expect, test, type TestInfo } from '@playwright/test';
import { ERROR_MESSAGES } from '../../src/lib/errorMessages';
import type { AnalysisErrorCode } from '../../src/lib/types';
import { fixturePath, readFixtureText } from '../fixtures/readFixture';
import {
  chooseBookButton,
  dropTextFile,
  expectKnownCountsResults,
  startLargeAnalysis,
  uploadFile,
} from './helpers';

const knownText = readFixtureText('known-counts.txt');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shows the drop zone with the privacy note', async ({ page }) => {
  await expect(chooseBookButton(page)).toBeVisible();
  await expect(page.getByText('Your book never leaves your device and is not saved')).toBeVisible();
});

test('the drop zone animates while idle, and is still with reduced motion (FR-016, FR-017)', async ({
  page,
}) => {
  const running = () => page.evaluate(() => document.getAnimations().length);
  await expect.poll(running).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(running).toBe(0);
});

test('analyzes known-counts.txt with exact counts', async ({ page }) => {
  await uploadFile(page, fixturePath('known-counts.txt'));
  await expectKnownCountsResults(page, 'known-counts.txt');
});

test('analyzes known-counts.epub with the same counts', async ({ page }) => {
  await uploadFile(page, fixturePath('known-counts.epub'));
  await expectKnownCountsResults(page, 'known-counts.epub');
});

test('"New book" returns to the upload screen with the drop zone focused', async ({ page }) => {
  await uploadFile(page, fixturePath('known-counts.txt'));
  await page.getByRole('button', { name: 'New book' }).click();
  await expect(chooseBookButton(page)).toBeFocused();
  await expect(page.getByRole('table')).toHaveCount(0);
});

const errorCases: [string, AnalysisErrorCode, (testInfo: TestInfo) => Promise<string>][] = [
  ['empty.txt', 'empty', () => Promise.resolve(fixturePath('empty.txt'))],
  ['numbers-only.txt', 'empty', () => Promise.resolve(fixturePath('numbers-only.txt'))],
  ['corrupted.epub', 'corrupted', () => Promise.resolve(fixturePath('corrupted.epub'))],
  ['drm.epub', 'protected', () => Promise.resolve(fixturePath('drm.epub'))],
  [
    'a .pdf',
    'unsupported',
    async (testInfo) => {
      const path = testInfo.outputPath('book.pdf');
      await writeFile(path, '%PDF-1.7\n');
      return path;
    },
  ],
  [
    'a 51 MB .txt',
    'too-large',
    async (testInfo) => {
      // Passed by path: Playwright rejects in-memory files over 50 MB.
      const path = testInfo.outputPath('big.txt');
      await writeFile(path, Buffer.alloc(51 * 1024 * 1024, 'a'));
      return path;
    },
  ],
];

for (const [label, code, makeFile] of errorCases) {
  test(`shows the ${code} message for ${label}`, async ({ page }, testInfo) => {
    await uploadFile(page, await makeFile(testInfo));
    await expect(page.getByRole('alert')).toContainText(ERROR_MESSAGES[code]);
    await page.getByRole('button', { name: 'Choose another book' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(chooseBookButton(page)).toBeFocused();
  });
}

test('a book dropped on the page while processing replaces the analysis', async ({
  page,
}, testInfo) => {
  await startLargeAnalysis(page, testInfo);
  await dropTextFile(page, 'known-counts.txt', knownText);
  await expectKnownCountsResults(page, 'known-counts.txt');
});

test('"Choose a different book" while processing replaces the analysis', async ({
  page,
}, testInfo) => {
  await startLargeAnalysis(page, testInfo);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Choose a different book' }).click(),
  ]);
  await chooser.setFiles(fixturePath('known-counts.txt'));
  await expectKnownCountsResults(page, 'known-counts.txt');
});

test('a book dropped on the results screen replaces the results', async ({ page }) => {
  await uploadFile(page, fixturePath('known-counts.txt'));
  await expectKnownCountsResults(page, 'known-counts.txt');
  await dropTextFile(page, 'other.txt', 'Another tiny book, another story.');
  await expect(
    page.getByRole('heading', { level: 2, name: 'other.txt', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('group', { name: 'Total words' })).toContainText('5');
});
