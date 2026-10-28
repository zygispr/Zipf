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
