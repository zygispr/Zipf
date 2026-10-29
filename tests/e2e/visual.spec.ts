// Pixel comparison of every screen and interaction state (specs/002-scss-styling research R7), the
// safety net for style-only changes. Tagged @visual: run only by `npm run test:visual` (Chromium),
// never in CI. Baselines are machine-specific and git-ignored: capture them on the code you are
// comparing against with `npm run test:visual -- --update-snapshots`, then compare after the
// change with `npm run test:visual`.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixturePath } from '../fixtures/readFixture';
import { chooseBookButton, startLargeAnalysis, uploadFile } from './helpers';

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  phone: { width: 390, height: 844 },
} as const;

const viewControl = (page: Page) => page.getByRole('radiogroup', { name: 'Visualization' });
const marks = (page: Page) => page.locator('[data-word-index]');

async function showResults(page: Page) {
  await uploadFile(page, fixturePath('known-counts.txt'));
  await expect(
    page.getByRole('heading', { level: 2, name: 'known-counts.txt', exact: true }),
  ).toBeFocused();
  await expect(marks(page).first()).toBeVisible();
}

async function showView(page: Page, view: string) {
  await showResults(page);
  await viewControl(page).getByRole('radio', { name: view }).click();
  await expect(viewControl(page).getByRole('radio', { name: view })).toBeChecked();
  await expect(marks(page).first()).toBeVisible();
}

async function showError(page: Page, file: string) {
  await uploadFile(page, fixturePath(file));
  await expect(page.getByRole('alert')).toBeVisible();
}

/** Presses Tab until `target` has focus, failing after `max` presses. */
async function tabTo(page: Page, target: Locator, max = 40) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

test.describe('visual', { tag: '@visual' }, () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      for (const reducedMotion of ['no-preference', 'reduce'] as const) {
        const conditions = `${colorScheme}-${viewportName}-${reducedMotion}`;

        test.describe(conditions, () => {
          test.use({ viewport });

          test.beforeEach(async ({ page }) => {
            await page.emulateMedia({ colorScheme, reducedMotion });
            await page.goto('/');
            await expect(chooseBookButton(page)).toBeVisible();
          });

          const expectScreenshot = async (page: Page, state: string, mask: Locator[] = []) => {
            await page.evaluate(() => document.fonts.ready);
            await expect(page).toHaveScreenshot(`${state}-${conditions}.png`, {
              fullPage: true,
              animations: 'disabled',
              maxDiffPixels: 0,
              mask,
            });
          };

          test('upload', async ({ page }) => {
            await expectScreenshot(page, 'upload');
          });

          test('upload, file dragged over the drop zone', async ({ page }) => {
            const zone = page.getByRole('group', { name: 'Drop a book here' });
            await zone.evaluate((element) => {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(new File(['text'], 'book.txt', { type: 'text/plain' }));
              for (const type of ['dragenter', 'dragover']) {
                element.dispatchEvent(
                  new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }),
                );
              }
            });
            await expect(page.locator('[data-dragging="true"]')).toBeVisible();
            await expectScreenshot(page, 'upload-dragging');
          });

          test('upload, button focused with the keyboard', async ({ page }) => {
            await page.evaluate(() => {
              (document.activeElement as HTMLElement | null)?.blur();
            });
            await tabTo(page, chooseBookButton(page));
            await expectScreenshot(page, 'upload-focused');
          });

          test('processing', async ({ page }, testInfo) => {
            // Drop every worker message so the panel stays on its first frame: a live analysis
            // changes the stage caption's width and can finish mid-screenshot.
            await page.addInitScript(() => {
              window.Worker = class extends window.Worker {
                override set onmessage(_handler: Worker['onmessage']) {
                  // Never attached.
                }
                override get onmessage(): Worker['onmessage'] {
                  return null;
                }
              };
            });
            await page.reload();
            await expect(chooseBookButton(page)).toBeVisible();
            await startLargeAnalysis(page, testInfo);
            const panel = page.locator('section', { has: page.getByRole('progressbar') });
            await expectScreenshot(page, 'processing', [
              page.getByRole('progressbar'),
              panel.locator('[aria-live]'),
            ]);
          });

          test('error, DRM-protected book', async ({ page }) => {
            await showError(page, 'drm.epub');
            await expectScreenshot(page, 'error-drm');
          });

          test('error, corrupted book', async ({ page }) => {
            await showError(page, 'corrupted.epub');
            await expectScreenshot(page, 'error-corrupted');
          });

          test('results, bar chart', async ({ page }) => {
            await showResults(page);
            await expectScreenshot(page, 'results-bar-chart');
          });

          test('results, bar chart with a hovered bar', async ({ page }) => {
            test.skip(viewportName === 'phone', 'hover is a desktop interaction');
            await showResults(page);
            await marks(page).first().hover();
            await expect(page.getByRole('tooltip')).toContainText('the');
            await expectScreenshot(page, 'results-bar-chart-hover');
          });

          test('results, word cloud', async ({ page }) => {
            await showView(page, 'Word cloud');
            await expectScreenshot(page, 'results-word-cloud');
          });

          test("results, Zipf's law", async ({ page }) => {
            await showView(page, "Zipf's law");
            await expectScreenshot(page, 'results-zipf');
          });

          test('results, filtered and searched', async ({ page }) => {
            await showResults(page);
            await page.getByRole('switch', { name: 'Hide common words' }).click();
            await page.getByRole('searchbox', { name: 'Find a word' }).fill('the');
            await expect(page.getByRole('status')).not.toBeEmpty();
            // Filling the search box scrolls the page under the mouse, which can land on a bar.
            await page.mouse.move(0, 0);
            await expect(page.getByRole('tooltip')).toBeHidden();
            await expectScreenshot(page, 'results-filtered');
          });
        });
      }
    }
  }
});
