// Performance budgets (plan Performance Goals, constitution V). Tagged @perf: run only by
// `npm run test:e2e:perf` (Chromium), in CI's separate performance job. Budgets are multiplied
// by PERF_BUDGET_SCALE (1.5 on CI runners); CLS is a ratio and is never scaled.
import { expect, test, type Page } from '@playwright/test';
import { generateZipfText } from '../fixtures/generateText';
import { fixturePath } from '../fixtures/readFixture';
import { startLargeAnalysis, uploadFile } from './helpers';

const scale = Number(process.env.PERF_BUDGET_SCALE ?? 1);

const NOVEL = Buffer.from(generateZipfText(100_000));
const VIEWS = ['Word cloud', "Zipf's law", 'Bar chart'] as const;

/** A long frame, split into script and rendering time (long-animation-frame). */
interface LongFrame {
  startTime: number;
  duration: number;
  script: number;
  render: number;
  scripts: string;
}

declare global {
  interface Window {
    __perf: {
      lcp: number;
      cls: number;
      longestInteraction: number;
      /** When recording started and when each view switch began, to attribute frames to them. */
      switches: { view: string; at: number }[];
      frames: number[];
      longFrames: LongFrame[];
      recording: boolean;
    };
  }
}

/**
 * Installed before the page loads. Collects LCP, CLS (shifts without recent input), the longest
 * Event Timing entry (the INP proxy), and, while recording, rAF timestamps and long frames.
 */
function installPerfObservers() {
  const perf: Window['__perf'] = {
    lcp: 0,
    cls: 0,
    longestInteraction: 0,
    switches: [],
    frames: [],
    longFrames: [],
    recording: false,
  };
  window.__perf = perf;
  const observe = (type: string, onEntry: (entry: PerformanceEntry) => void, options = {}) => {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) return false;
    new PerformanceObserver((list) => {
      list.getEntries().forEach(onEntry);
    }).observe({ type, buffered: true, ...options });
    return true;
  };
  observe('largest-contentful-paint', (entry) => {
    perf.lcp = entry.startTime;
  });
  observe('layout-shift', (entry) => {
    const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
    if (!shift.hadRecentInput) perf.cls += shift.value;
  });
  observe(
    'event',
    (entry) => {
      perf.longestInteraction = Math.max(perf.longestInteraction, entry.duration);
    },
    { durationThreshold: 16 },
  );
  const onLongFrame = (entry: PerformanceEntry) => {
    if (!perf.recording) return;
    // longtask entries (the fallback) have no script or render breakdown.
    const frame = entry as PerformanceEntry & {
      renderStart?: number;
      scripts?: { invoker: string; duration: number }[];
    };
    const scripts = frame.scripts ?? [];
    perf.longFrames.push({
      startTime: entry.startTime,
      duration: Math.round(entry.duration),
      script: Math.round(scripts.reduce((sum, script) => sum + script.duration, 0)),
      render: Math.round(
        frame.renderStart ? entry.startTime + entry.duration - frame.renderStart : 0,
      ),
      scripts: scripts
        .map((script) => `${script.invoker} ${String(Math.round(script.duration))}ms`)
        .join(', '),
    });
  };
  if (!observe('long-animation-frame', onLongFrame)) observe('longtask', onLongFrame);
  const onFrame = (time: number) => {
    if (perf.recording) perf.frames.push(time);
    requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);
}

const heading = (page: Page, name: string) =>
  page.getByRole('heading', { level: 2, name, exact: true });

async function throttleCpu(page: Page, rate: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
}

/** Milliseconds from choosing the file to the results heading being shown (SC-001). */
async function timeToResults(page: Page): Promise<number> {
  await page.goto('/');
  const start = Date.now();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name: 'novel.txt', mimeType: 'text/plain', buffer: NOVEL });
  await expect(heading(page, 'novel.txt')).toBeVisible({ timeout: 30_000 });
  return Date.now() - start;
}

/**
 * Switches through every view while recording frames. Returns the worst frame, the median frame
 * interval, and a breakdown for failure messages: the longest gap between frames per view switch
 * (which includes rasterizing, done off the main thread) and the longest main-thread frames.
 */
async function recordViewSwitches(page: Page) {
  await page.evaluate(() => {
    window.__perf.frames = [];
    window.__perf.longFrames = [];
    window.__perf.switches = [];
    window.__perf.recording = true;
  });
  const control = page.getByRole('radiogroup', { name: 'Visualization' });
  for (const view of VIEWS) {
    await page.evaluate((name) => {
      window.__perf.switches.push({ view: name, at: performance.now() });
    }, view);
    await control.getByRole('radio', { name: view }).click();
    await expect(control.getByRole('radio', { name: view })).toBeChecked();
    // Long enough for the cross-fade and the chart's entrance animation to finish.
    await page.waitForTimeout(800);
  }
  const {
    frames,
    switches,
    longFrames: observed,
  } = await page.evaluate(() => {
    window.__perf.recording = false;
    return window.__perf;
  });
  // Entries arrive after the frame they describe, so attribute them by time and drop any frame
  // that started before the first switch (such as one from the top-N change before recording).
  const viewAt = (time: number) => switches.findLast(({ at }) => at <= time)?.view;
  const longFrames = observed.filter((frame) => viewAt(frame.startTime));
  const intervals = frames
    .slice(1)
    .map((time, i) => ({ view: viewAt(time), gap: time - (frames[i] ?? time) }))
    .filter((interval) => interval.view);
  const gaps = intervals.map(({ gap }) => gap);
  const sorted = [...gaps].sort((a, b) => a - b);
  const longestGapPerView = VIEWS.map((view) => {
    const gap = Math.max(0, ...intervals.filter((i) => i.view === view).map((i) => i.gap));
    return `${view}: ${String(Math.round(gap))} ms`;
  });
  const longestFrames = [...longFrames]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 3)
    .map(
      (f) =>
        `${viewAt(f.startTime) ?? ''}: ${String(f.duration)} ms (script ${String(f.script)}, render ${String(f.render)}${f.scripts ? `; ${f.scripts}` : ''})`,
    );
  return {
    worstFrame: Math.max(0, ...gaps, ...longFrames.map((frame) => frame.duration)),
    medianInterval: sorted[Math.floor(sorted.length / 2)] ?? 0,
    frameCount: frames.length,
    breakdown: [
      `Longest gap between frames, by view: ${longestGapPerView.join('; ')}`,
      `Longest main-thread frames: ${longestFrames.join(' | ') || 'none over 50 ms'}`,
    ].join('\n'),
  };
}

test.describe('performance budgets', { tag: '@perf' }, () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(
      browserName !== 'chromium',
      'CDP throttling and long-animation-frame are Chromium-only',
    );
    await page.addInitScript(installPerfObservers);
  });

  test('a 100k-word novel shows results within 3 s (SC-001)', async ({ page }) => {
    expect(await timeToResults(page)).toBeLessThanOrEqual(3000 * scale);
  });

  test('with 4× CPU throttling, within 6 s (SC-001, mid-range phone proxy)', async ({ page }) => {
    await throttleCpu(page, 4);
    expect(await timeToResults(page)).toBeLessThanOrEqual(6000 * scale);
  });

  test('Cancel responds within 100 ms while a book is processing (SC-005)', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await startLargeAnalysis(page, testInfo);
    await page.evaluate(() => {
      window.__perf.longestInteraction = 0;
    });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Choose a book' })).toBeVisible();
    // Event Timing duration: from the click to the next frame painted after handling it.
    const feedback = await page.evaluate(() => window.__perf.longestInteraction);
    expect(feedback).toBeLessThan(100 * scale);
  });

  test('Core Web Vitals: LCP < 2.5 s, CLS < 0.1, interactions < 200 ms', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page, fixturePath('known-counts.txt'));
    await expect(heading(page, 'known-counts.txt')).toBeVisible();

    const control = page.getByRole('radiogroup', { name: 'Visualization' });
    for (const view of VIEWS) {
      await control.getByRole('radio', { name: view }).click();
      await page.waitForTimeout(400);
    }
    for (const n of ['10', '100', '25']) {
      await page
        .getByRole('radiogroup', { name: 'Top words' })
        .getByRole('radio', { name: n, exact: true })
        .click();
      await page.waitForTimeout(400);
    }
    await page.getByRole('searchbox', { name: 'Find a word' }).pressSequentially('librarian');
    await expect(page.getByRole('status')).toContainText('librarian: 4 times');

    const { lcp, cls, longestInteraction } = await page.evaluate(() => window.__perf);
    expect(lcp).toBeGreaterThan(0);
    expect(lcp).toBeLessThan(2500 * scale);
    expect(cls).toBeLessThan(0.1);
    expect(longestInteraction).toBeLessThan(200 * scale);
  });

  test.describe('switching views keeps animations smooth', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles({ name: 'novel.txt', mimeType: 'text/plain', buffer: NOVEL });
      await expect(heading(page, 'novel.txt')).toBeVisible({ timeout: 30_000 });
      await page
        .getByRole('radiogroup', { name: 'Top words' })
        .getByRole('radio', { name: '100' })
        .click();
      await expect(page.locator('[data-word-index]')).toHaveCount(100);
    });

    test('no frame over 50 ms, median frame interval ≤ 20 ms (60 fps target)', async ({ page }) => {
      const { worstFrame, medianInterval, frameCount, breakdown } = await recordViewSwitches(page);
      expect(frameCount).toBeGreaterThan(60);
      expect(worstFrame, breakdown).toBeLessThanOrEqual(50 * scale);
      expect(medianInterval).toBeLessThanOrEqual(20 * scale);
    });

    test('with 4× CPU throttling, no frame over 100 ms', async ({ page }) => {
      await throttleCpu(page, 4);
      const { worstFrame, breakdown } = await recordViewSwitches(page);
      expect(worstFrame, breakdown).toBeLessThanOrEqual(100 * scale);
    });
  });
});
