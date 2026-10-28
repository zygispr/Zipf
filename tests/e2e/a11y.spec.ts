// Accessibility and layout (FR-018, quickstart scenario 10): axe scans of every state, a
// keyboard-only run through every feature, and no horizontal scroll at 320 px.
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixturePath } from '../fixtures/readFixture';
import { chooseBookButton, startLargeAnalysis, uploadFile } from './helpers';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const VIEWS = ['Bar chart', 'Word cloud', "Zipf's law"] as const;

async function expectNoSeriousViolations(page: Page, state: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const serious = violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(
      ({ id, help, nodes }) =>
        `${id}: ${help} (${nodes.map((n) => n.target.join(' ')).join(', ')})`,
    );
  expect(serious, `axe violations in the ${state} state`).toEqual([]);
}

const viewControl = (page: Page) => page.getByRole('radiogroup', { name: 'Visualization' });
const resultsHeading = (page: Page, name: string) =>
  page.getByRole('heading', { level: 2, name, exact: true });

async function showResults(page: Page, file = 'known-counts.txt') {
  await uploadFile(page, fixturePath(file));
  await expect(resultsHeading(page, file)).toBeFocused();
}

test.describe('axe finds no serious or critical violations', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`${colorScheme} theme`, () => {
      test.beforeEach(async ({ page }) => {
        // Settled states only: a fade-in caught half way would fail the contrast check.
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
        await page.goto('/');
      });

      test('upload', async ({ page }) => {
        await expect(chooseBookButton(page)).toBeVisible();
        await expectNoSeriousViolations(page, 'upload');
      });

      test('processing', async ({ page }, testInfo) => {
        await startLargeAnalysis(page, testInfo);
        await expectNoSeriousViolations(page, 'processing');
      });

      test('error', async ({ page }) => {
        await uploadFile(page, fixturePath('drm.epub'));
        await expect(page.getByRole('alert')).toBeVisible();
        await expectNoSeriousViolations(page, 'error');
      });

      test('results, in each visualization', async ({ page }) => {
        await showResults(page);
        for (const view of VIEWS) {
          await viewControl(page).getByRole('radio', { name: view }).click();
          await expect(viewControl(page).getByRole('radio', { name: view })).toBeChecked();
          await expect(page.locator('[data-word-index]').first()).toBeVisible();
          await expectNoSeriousViolations(page, `results (${view})`);
        }
      });

      test('results, filtered and searched', async ({ page }) => {
        await showResults(page);
        await page.getByRole('switch', { name: 'Hide common words' }).click();
        await page.getByRole('searchbox', { name: 'Find a word' }).fill('the');
        await expect(page.getByRole('status')).not.toBeEmpty();
        await expectNoSeriousViolations(page, 'results (filtered, searched)');
      });

      test('results for a book that is not English', async ({ page }) => {
        await showResults(page, 'cyrillic.txt');
        await expectNoSeriousViolations(page, 'results (filter unavailable)');
      });
    });
  }
});

/** Presses Tab until `target` has focus, failing after `max` presses. */
async function tabTo(page: Page, target: Locator, max = 40) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

test('every feature works with the keyboard alone', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard navigation is a desktop interaction');
  await page.goto('/');

  // Upload: the drop zone's button has focus and opens the file picker.
  await expect(chooseBookButton(page)).toBeFocused();
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.keyboard.press('Enter'),
  ]);
  await chooser.setFiles(fixturePath('known-counts.txt'));
  await expect(resultsHeading(page, 'known-counts.txt')).toBeFocused();

  // Switch views with the arrow keys.
  await tabTo(page, viewControl(page).getByRole('radio', { name: 'Bar chart' }));
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('group', { name: /word cloud/i })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('group', { name: /zipf/i })).toBeVisible();

  // Top words and the common-word filter.
  const topWords = page.getByRole('radiogroup', { name: 'Top words' });
  await tabTo(page, topWords.getByRole('radio', { name: '25', exact: true }));
  await page.keyboard.press('ArrowRight');
  await expect(topWords.getByRole('radio', { name: '50', exact: true })).toBeChecked();
  const hideCommonWords = page.getByRole('switch', { name: 'Hide common words' });
  await tabTo(page, hideCommonWords);
  await page.keyboard.press('Space');
  await expect(hideCommonWords).toHaveAttribute('aria-checked', 'true');

  // Search.
  const search = page.getByRole('searchbox', { name: 'Find a word' });
  await tabTo(page, search);
  await page.keyboard.type('read');
  await expect(page.getByRole('status')).toContainText('read: 7 times · rank #1');

  // Export: Shift+Tab back up to the toolbar.
  const download = page.getByRole('button', { name: 'Download results' });
  for (
    let i = 0;
    i < 40 && !(await download.evaluate((el) => el === document.activeElement));
    i++
  ) {
    await page.keyboard.press('Shift+Tab');
  }
  await expect(download).toBeFocused();
  const [file] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
  const csv = await readFile(await file.path(), 'utf8');
  expect(csv.split('\r\n')[1]).toMatch(/^1,read,7,/);

  // Start over.
  await tabTo(page, page.getByRole('button', { name: 'New book' }));
  await page.keyboard.press('Enter');
  await expect(chooseBookButton(page)).toBeFocused();
});

test.describe('at 320 px wide', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  const expectNoHorizontalScroll = async (page: Page, state: string) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth, `page width in the ${state} state`).toBeLessThanOrEqual(320);
  };

  test('nothing scrolls horizontally', async ({ page }) => {
    await page.goto('/');
    await expectNoHorizontalScroll(page, 'upload');

    await uploadFile(page, fixturePath('drm.epub'));
    await expect(page.getByRole('alert')).toBeVisible();
    await expectNoHorizontalScroll(page, 'error');
    await page.getByRole('button', { name: 'Choose another book' }).click();

    await showResults(page);
    for (const view of VIEWS) {
      await viewControl(page).getByRole('radio', { name: view }).click();
      await expect(page.locator('[data-word-index]').first()).toBeVisible();
      await expectNoHorizontalScroll(page, `results (${view})`);
    }
    await page
      .getByRole('radiogroup', { name: 'Top words' })
      .getByRole('radio', { name: '100' })
      .click();
    await page
      .getByRole('searchbox', { name: 'Find a word' })
      .fill('supercalifragilisticexpialidocious');
    await expectNoHorizontalScroll(page, 'results (top 100, long search)');
  });
});
