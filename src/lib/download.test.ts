import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadTextFile } from './download';

describe('downloadTextFile', () => {
  let createObjectURL: ReturnType<typeof vi.fn<(blob: Blob) => string>>;
  let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>;
  let clicked: HTMLAnchorElement[];

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL = vi.fn(() => 'blob:fake-url');
    revokeObjectURL = vi.fn();
    // jsdom has no object URLs.
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clicks a temporary <a download> pointing at an object URL for the content', async () => {
    downloadTextFile('rank,word\r\n', 'book-word-frequencies.csv');
    expect(clicked).toHaveLength(1);
    const [link] = clicked;
    expect(link?.download).toBe('book-word-frequencies.csv');
    expect(link?.getAttribute('href')).toBe('blob:fake-url');
    expect(document.body.contains(link ?? null)).toBe(false);

    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('text/csv;charset=utf-8');
    expect(await blob?.text()).toBe('rank,word\r\n');
  });

  it('revokes the object URL on the next tick, not before the click', () => {
    downloadTextFile('x', 'x.csv');
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });

  it('uses the given MIME type', () => {
    downloadTextFile('x', 'x.txt', 'text/plain');
    expect(createObjectURL.mock.calls[0]?.[0].type).toBe('text/plain');
  });
});
