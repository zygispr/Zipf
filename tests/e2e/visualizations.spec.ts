// US2 end-to-end checks (quickstart scenarios 4 and 5).
import { expect, test, type Page } from '@playwright/test';
import { fixturePath, readExpectedCounts } from '../fixtures/readFixture';
import { uploadFile } from './helpers';

const expected = readExpectedCounts();

const viewControl = (page: Page) => page.getByRole('radiogroup', { name: 'Visualization' });
const chart = (page: Page, name: RegExp) => page.getByRole('group', { name });
const marks = (page: Page) => page.locator('[data-word-index]');
const tooltip = (page: Page) => page.getByRole('tooltip');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await uploadFile(page, fixturePath('known-counts.txt'));
  await expect(chart(page, /bar chart/i)).toBeVisible();
});

test('the bar chart shows the top 25 words, matching the table', async ({ page }) => {
  const labels = await marks(page).evaluateAll((bars) =>
    bars.map((bar) => bar.getAttribute('aria-label')),
  );
  expect(labels).toEqual(
    expected.entries.slice(0, 25).map(([word, count]) => `${word}: ${String(count)} times`),
  );
});

test('switches views with the mouse and the keyboard', async ({ page }) => {
  await viewControl(page).getByRole('radio', { name: 'Word cloud' }).click();
  await expect(chart(page, /word cloud/i)).toBeVisible();
  await expect(marks(page).first()).toBeVisible();

  await viewControl(page).getByRole('radio', { name: 'Word cloud' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(viewControl(page).getByRole('radio', { name: "Zipf's law" })).toBeFocused();
  const zipf = chart(page, /zipf/i);
  await expect(zipf).toBeVisible();
  await expect(page.getByText('Ideal Zipf curve', { exact: true })).toBeVisible();
  await expect(zipf.locator('[data-word-index]')).toHaveCount(expected.distinctWords);

  await page.keyboard.press('Home');
  await expect(chart(page, /bar chart/i)).toBeVisible();
});

test('hovering a bar shows its tooltip', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover is a desktop interaction');
  await marks(page).first().hover();
  await expect(tooltip(page)).toContainText('the');
  await expect(tooltip(page)).toContainText('Count: 23');
  await expect(tooltip(page)).toContainText('Rank: #1');
});

test('tapping a bar, a cloud word, and a Zipf point shows the tooltip', async ({
  page,
  hasTouch,
}) => {
  test.skip(!hasTouch, 'tap needs a touch device');
  const heading = page.getByRole('heading', { level: 2, name: 'known-counts.txt', exact: true });

  await marks(page).first().tap();
  await expect(tooltip(page)).toContainText('Count: 23');
  await heading.tap();
  await expect(tooltip(page)).toBeHidden();

  await viewControl(page).getByRole('radio', { name: 'Word cloud' }).tap();
  await expect(chart(page, /word cloud/i)).toBeVisible();
  const cloudWord = page.getByRole('img', { name: 'the: 23 times' });
  await cloudWord.tap();
  await expect(tooltip(page)).toContainText('Rank: #1');
  await heading.tap();
  await expect(tooltip(page)).toBeHidden();

  await viewControl(page).getByRole('radio', { name: "Zipf's law" }).tap();
  await expect(chart(page, /zipf/i)).toBeVisible();
  await page.getByRole('img', { name: 'Rank 1: the, 23 times' }).tap();
  await expect(tooltip(page)).toContainText('the');
  await heading.tap();
  await expect(tooltip(page)).toBeHidden();
});

test('with reduced motion, switching views runs no animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const name of ['Word cloud', "Zipf's law", 'Bar chart']) {
    await viewControl(page).getByRole('radio', { name }).click();
    await page.waitForTimeout(50);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  }
});
