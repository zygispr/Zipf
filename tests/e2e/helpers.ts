import { expect, type Page } from '@playwright/test';
import { formatPercent } from '../../src/lib/selectView';
import { readExpectedCounts } from '../fixtures/readFixture';

export const chooseBookButton = (page: Page) => page.getByRole('button', { name: 'Choose a book' });

export async function uploadFile(page: Page, path: string) {
  await page.locator('input[type="file"]').first().setInputFiles(path);
}

/** Drops a text file on `document.body`, as a user dragging a book onto the page would. */
export async function dropTextFile(page: Page, name: string, text: string) {
  await page.evaluate(
    ({ name, text }) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File([text], name, { type: 'text/plain' }));
      for (const type of ['dragenter', 'dragover', 'drop']) {
        document.body.dispatchEvent(
          new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }),
        );
      }
    },
    { name, text },
  );
}

/** Asserts the summary stats and the first table page match known-counts.json. */
export async function expectKnownCountsResults(page: Page, bookName: string) {
  const expected = readExpectedCounts();
  await expect(page.getByRole('heading', { level: 2, name: bookName, exact: true })).toBeFocused();

  await expect(page.getByRole('group', { name: 'Total words' })).toContainText(
    String(expected.totalWords),
  );
  await expect(page.getByRole('group', { name: 'Distinct words' })).toContainText(
    String(expected.distinctWords),
  );
  const [topWord, topCount] = expected.entries[0] ?? ['', 0];
  const topCard = page.getByRole('group', { name: 'Most frequent word' });
  await expect(topCard).toContainText(topWord);
  await expect(topCard).toContainText(`${String(topCount)} times`);

  const rows = page.getByRole('table', { name: 'All words by frequency' }).locator('tbody tr');
  const firstPage = expected.entries.slice(0, 50);
  await expect(rows).toHaveCount(firstPage.length);
  const cells = await rows.evaluateAll((trs) =>
    trs.map((tr) => [...(tr as HTMLTableRowElement).cells].map((td) => td.textContent.trim())),
  );
  expect(cells).toEqual(
    firstPage.map(([word, count], index) => [
      String(index + 1),
      word,
      String(count),
      formatPercent((count / expected.totalWords) * 100),
    ]),
  );
}
