import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW_SETTINGS } from '../lib/types';
import { useViewSettings, viewSettingsReducer } from './useViewSettings';

describe('viewSettingsReducer', () => {
  it('sets the visualization', () => {
    expect(
      viewSettingsReducer(DEFAULT_VIEW_SETTINGS, {
        type: 'setVisualization',
        visualization: 'zipf',
      }),
    ).toEqual({ ...DEFAULT_VIEW_SETTINGS, visualization: 'zipf' });
  });

  it('sets top-N', () => {
    expect(viewSettingsReducer(DEFAULT_VIEW_SETTINGS, { type: 'setTopN', topN: 100 })).toEqual({
      ...DEFAULT_VIEW_SETTINGS,
      topN: 100,
    });
  });

  it('turns hiding common words on only for likely-English books (FR-019)', () => {
    const on = { type: 'setHideCommonWords', hideCommonWords: true } as const;
    expect(viewSettingsReducer(DEFAULT_VIEW_SETTINGS, { ...on, isLikelyEnglish: true })).toEqual({
      ...DEFAULT_VIEW_SETTINGS,
      hideCommonWords: true,
    });
    expect(viewSettingsReducer(DEFAULT_VIEW_SETTINGS, { ...on, isLikelyEnglish: false })).toBe(
      DEFAULT_VIEW_SETTINGS,
    );
  });

  it('turns hiding common words off for any book', () => {
    const hidden = { ...DEFAULT_VIEW_SETTINGS, hideCommonWords: true };
    expect(
      viewSettingsReducer(hidden, {
        type: 'setHideCommonWords',
        hideCommonWords: false,
        isLikelyEnglish: false,
      }),
    ).toEqual(DEFAULT_VIEW_SETTINGS);
  });

  it('resets to the defaults', () => {
    const changed = { visualization: 'cloud', topN: 10, hideCommonWords: true } as const;
    expect(viewSettingsReducer(changed, { type: 'reset' })).toEqual(DEFAULT_VIEW_SETTINGS);
  });
});

describe('useViewSettings', () => {
  it('starts at the defaults: bar chart, top 25, common words shown', () => {
    const { result } = renderHook(() => useViewSettings(true));
    expect(result.current[0]).toEqual({
      visualization: 'bar',
      topN: 25,
      hideCommonWords: false,
    });
  });

  it('exposes actions that update the settings', () => {
    const { result } = renderHook(() => useViewSettings(true));
    act(() => {
      result.current[1].setVisualization('cloud');
      result.current[1].setTopN(50);
      result.current[1].setHideCommonWords(true);
    });
    expect(result.current[0]).toEqual({ visualization: 'cloud', topN: 50, hideCommonWords: true });
    act(() => {
      result.current[1].reset();
    });
    expect(result.current[0]).toEqual(DEFAULT_VIEW_SETTINGS);
  });

  it('keeps common words shown for books that are not likely English', () => {
    const { result } = renderHook(() => useViewSettings(false));
    act(() => {
      result.current[1].setHideCommonWords(true);
    });
    expect(result.current[0].hideCommonWords).toBe(false);
  });

  it('keeps the same actions object between renders', () => {
    const { result, rerender } = renderHook(() => useViewSettings(true));
    const first = result.current[1];
    rerender();
    expect(result.current[1]).toBe(first);
  });
});
