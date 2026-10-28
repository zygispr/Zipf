// Privacy guarantees FR-004 and SC-006 (quickstart scenario 2).
import { expect, test } from '@playwright/test';
import { fixturePath } from '../fixtures/readFixture';
import { chooseBookButton, uploadFile } from './helpers';

test('makes zero network requests after the page has loaded', async ({ page, context }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto('/', { waitUntil: 'load' });

  // Context-level listener: it also sees requests made by the dedicated worker.
  const requests: string[] = [];
  context.on('request', (request) => requests.push(`${request.method()} ${request.url()}`));
  const workerCreated = page.waitForEvent('worker');

  await uploadFile(page, fixturePath('known-counts.txt'));
  await workerCreated;
  await expect(
    page.getByRole('heading', { level: 2, name: 'known-counts.txt', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Page 2 of 3')).toBeVisible();
  // Every view; the word cloud is laid out in a second worker.
  const views = page.getByRole('radiogroup', { name: 'Visualization' });
  for (const view of ['Word cloud', "Zipf's law", 'Bar chart']) {
    await views.getByRole('radio', { name: view }).click();
    await expect(page.locator('[data-word-index]').first()).toBeVisible();
  }
  await page
    .getByRole('radiogroup', { name: 'Top words' })
    .getByRole('radio', { name: '100' })
    .click();
  await page.getByRole('switch', { name: 'Hide common words' }).click();
  await page.getByRole('searchbox', { name: 'Find a word' }).fill('librarian');
  await expect(page.getByRole('status')).toContainText('librarian');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download results' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('known-counts-word-frequencies.csv');
  await page.getByRole('button', { name: 'New book' }).click();
  await expect(chooseBookButton(page)).toBeVisible();

  // blob: and data: URLs (such as the inline worker script) are read from memory, so they never
  // leave the device. Every other request is a network request and fails the test.
  const networkRequests = requests.filter((request) => !/^GET (?:blob|data):/.test(request));
  expect(networkRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('the production page has a CSP that blocks network access', async ({ page }) => {
  await page.goto('/');
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  expect(csp).toContain("connect-src 'none'");
});

test('reloading forgets the previous results', async ({ page }) => {
  await page.goto('/');
  await uploadFile(page, fixturePath('known-counts.txt'));
  await expect(
    page.getByRole('heading', { level: 2, name: 'known-counts.txt', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(chooseBookButton(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'known-counts.txt', exact: true })).toHaveCount(0);
  await expect(page.getByRole('table')).toHaveCount(0);
});
