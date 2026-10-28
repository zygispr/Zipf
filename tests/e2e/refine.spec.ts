// US3 end-to-end checks (quickstart scenario 6).
import { expect, test, type Page } from '@playwright/test';
import { formatPercent } from '../../src/lib/selectView';
import { ENGLISH_STOP_WORDS } from '../../src/lib/stopWords';
import { fixturePath, readExpectedCounts } from '../fixtures/readFixture';
import { chooseBookButton, uploadFile } from './helpers';

const expected = readExpectedCounts();

const hideCommonWords = (page: Page) => page.getByRole('switch', { name: 'Hide common words' });
const topWords = (page: Page) => page.getByRole('radiogroup', { name: 'Top words' });
const bars = (page: Page) => page.locator('[data-word-index]');
const search = (page: Page) => page.getByRole('searchbox', { name: 'Find a word' });
const searchResult = (page: Page) => page.getByRole('status');
const tableWords = (page: Page) =>
  page.getByRole('table', { name: 'All words by frequency' }).locator('tbody th');

async function showKnownCounts(page: Page) {
  await page.goto('/');
  await uploadFile(page, fixturePath('known-counts.txt'));
  await expect(page.getByRole('heading', { level: 2, name: 'known-counts.txt' })).toBeVisible();
}

test.describe('with an English book', () => {
  test.beforeEach(async ({ page }) => {
    await showKnownCounts(page);
  });

  test('hiding common words removes them and re-ranks the rest', async ({ page }) => {
    await expect(hideCommonWords(page)).toHaveAttribute('aria-checked', 'false');
    await expect(tableWords(page).first()).toHaveText('the');

    await hideCommonWords(page).click();
    await expect(hideCommonWords(page)).toHaveAttribute('aria-checked', 'true');
    const kept = expected.entries.filter(([word]) => !ENGLISH_STOP_WORDS.has(word));
    const keptTotal = kept.reduce((sum, [, count]) => sum + count, 0);
    const rows = page.getByRole('table', { name: 'All words by frequency' }).locator('tbody tr');
    await expect(rows.first()).toHaveText(
      new RegExp(`^1${kept[0]?.[0] ?? ''}${String(kept[0]?.[1])}`),
    );
    const cells = await rows.evaluateAll((trs) =>
      trs.map((tr) => [...(tr as HTMLTableRowElement).cells].map((td) => td.textContent.trim())),
    );
    expect(cells).toEqual(
      kept
        .slice(0, 50)
        .map(([word, count], index) => [
          String(index + 1),
          word,
          String(count),
          formatPercent((count / keptTotal) * 100),
        ]),
    );
    await expect(bars(page).first()).toHaveAttribute(
      'aria-label',
      `${kept[0]?.[0] ?? ''}: ${String(kept[0]?.[1])} times`,
    );
    // The summary keeps the book totals.
    await expect(page.getByRole('group', { name: 'Total words' })).toContainText(
      String(expected.totalWords),
    );

    // A hidden word is reported as hidden, not as missing from the book.
    await search(page).fill('the');
    await expect(searchResult(page)).toHaveText(
      '“the” is a common word, hidden while “Hide common words” is on',
    );

    await hideCommonWords(page).click();
    await expect(tableWords(page).first()).toHaveText('the');
    await expect(searchResult(page)).toContainText('the: 23 times · rank #1');
  });

  test('"Top words" changes the number of bars', async ({ page }) => {
    await expect(bars(page)).toHaveCount(25);
    for (const n of [10, 50, 100]) {
      await topWords(page)
        .getByRole('radio', { name: String(n), exact: true })
        .click();
      await expect(bars(page)).toHaveCount(n);
    }
  });

  test('search shows count and rank, or that the word is not found', async ({ page }) => {
    const rank = expected.entries.findIndex(([word]) => word === "don't") + 1;
    const [, count] = expected.entries[rank - 1] ?? ['', 0];
    await search(page).fill('don’t');
    await expect(searchResult(page)).toContainText(
      `don't: ${String(count)} times · rank #${String(rank)}`,
    );
    await search(page).fill('zzz');
    await expect(searchResult(page)).toHaveText("“zzz” doesn't appear in this book");
  });

  test('"New book" clears the results', async ({ page }) => {
    await page.getByRole('button', { name: 'New book' }).click();
    await expect(chooseBookButton(page)).toBeFocused();
    await expect(page.getByRole('heading', { level: 2, name: 'known-counts.txt' })).toBeHidden();
    await expect(page.getByRole('table', { name: 'All words by frequency' })).toBeHidden();
  });
});

test('with a Russian book, hiding common words is disabled with an explanation', async ({
  page,
}) => {
  await page.goto('/');
  await uploadFile(page, fixturePath('cyrillic.txt'));
  await expect(page.getByRole('heading', { level: 2, name: 'cyrillic.txt' })).toBeVisible();
  await expect(hideCommonWords(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(hideCommonWords(page)).toHaveAccessibleDescription(
    'Common-word filtering is available for English books',
  );
  // Still focusable, so keyboard users reach the explanation; pressing it does nothing.
  await hideCommonWords(page).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await expect(hideCommonWords(page)).toHaveAttribute('aria-checked', 'false');
});
