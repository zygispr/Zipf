import { act, renderHook } from '@testing-library/react';
import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReducedMotion } from './useReducedMotion';

function stubPreference(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (media: string) => ({
    get matches() {
      return matches;
    },
    media,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return (next: boolean) => {
    matches = next;
    for (const listener of listeners) listener();
  };
}

const withConfig =
  (reducedMotion: 'always' | 'never' | 'user') =>
  ({ children }: { children: ReactNode }) => (
    <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useReducedMotion', () => {
  it('follows the OS preference, including changes while mounted', () => {
    const setPreference = stubPreference(false);
    const { result } = renderHook(() => useReducedMotion(), { wrapper: withConfig('user') });
    expect(result.current).toBe(false);
    act(() => {
      setPreference(true);
    });
    expect(result.current).toBe(true);
  });

  it('lets MotionConfig force it on or off', () => {
    stubPreference(false);
    expect(
      renderHook(() => useReducedMotion(), { wrapper: withConfig('always') }).result.current,
    ).toBe(true);
    stubPreference(true);
    expect(
      renderHook(() => useReducedMotion(), { wrapper: withConfig('never') }).result.current,
    ).toBe(false);
  });

  it('is false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });
});
