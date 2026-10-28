import { act, fireEvent, renderHook } from '@testing-library/react';
import type { FocusEvent, KeyboardEvent, PointerEvent } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useWordTooltip } from './useWordTooltip';

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;

function setup(count = 3) {
  const container = document.createElement('div');
  container.getBoundingClientRect = () => rect(100, 50, 600, 400);
  const marks = Array.from({ length: count }, (_, i) => {
    const mark = document.createElement('button');
    mark.dataset.wordIndex = String(i);
    mark.getBoundingClientRect = () => rect(200 + i * 40, 150, 20, 10);
    container.append(mark);
    return mark;
  });
  document.body.append(container);
  const hook = renderHook(() => useWordTooltip(count));
  hook.result.current.containerRef.current = container;
  const props = (index: number) => hook.result.current.getWordProps(`w${String(index)}`, index);
  const pointer = (index: number, pointerType: string) =>
    ({ pointerType, currentTarget: marks[index] }) as unknown as PointerEvent;
  const focus = (index: number) => ({ currentTarget: marks[index] }) as unknown as FocusEvent;
  return { hook, marks, props, pointer, focus };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useWordTooltip', () => {
  it('shows on mouse hover above the word, relative to the chart, and hides on leave', () => {
    const { hook, props, pointer } = setup();
    act(() => {
      props(1).onPointerEnter(pointer(1, 'mouse'));
    });
    expect(hook.result.current.activeWord).toBe('w1');
    // Mark 1 is centered at x = 240 + 10 = 250 → 150 inside the container; its top is 100.
    expect(hook.result.current.position).toEqual({ x: 150, y: 100 });
    expect(props(1)['aria-describedby']).toBe(hook.result.current.tooltipId);
    act(() => {
      props(1).onPointerLeave(pointer(1, 'mouse'));
    });
    expect(hook.result.current.activeWord).toBeNull();
  });

  it('shows on keyboard focus and hides on blur', () => {
    const { hook, props, focus } = setup();
    act(() => {
      props(2).onFocus(focus(2));
    });
    expect(hook.result.current.activeWord).toBe('w2');
    act(() => {
      props(2).onBlur();
    });
    expect(hook.result.current.activeWord).toBeNull();
  });

  it('toggles on tap, ignoring the focus and hover that a tap also causes', () => {
    const { hook, props, pointer, focus } = setup();
    act(() => {
      props(0).onPointerEnter(pointer(0, 'touch'));
      props(0).onPointerDown(pointer(0, 'touch'));
      props(0).onFocus(focus(0));
    });
    expect(hook.result.current.activeWord).toBeNull();
    act(() => {
      props(0).onPointerUp(pointer(0, 'touch'));
    });
    expect(hook.result.current.activeWord).toBe('w0');
    act(() => {
      props(0).onPointerDown(pointer(0, 'touch'));
      props(0).onPointerUp(pointer(0, 'touch'));
    });
    expect(hook.result.current.activeWord).toBeNull();
  });

  it('closes when the user taps outside the chart', () => {
    const { hook, props, pointer } = setup();
    act(() => {
      props(0).onPointerDown(pointer(0, 'touch'));
      props(0).onPointerUp(pointer(0, 'touch'));
    });
    act(() => {
      fireEvent.pointerDown(document.body);
    });
    expect(hook.result.current.activeWord).toBeNull();
  });

  it('closes on dismiss (Escape)', () => {
    const { hook, props, focus } = setup();
    act(() => {
      props(0).onFocus(focus(0));
    });
    act(() => {
      hook.result.current.dismiss();
    });
    expect(hook.result.current.activeWord).toBeNull();
  });

  it('gives the chart a single tab stop that follows focus', () => {
    const { props, focus } = setup();
    expect([0, 1, 2].map((i) => props(i).tabIndex)).toEqual([0, -1, -1]);
    act(() => {
      props(2).onFocus(focus(2));
    });
    expect([0, 1, 2].map((i) => props(i).tabIndex)).toEqual([-1, -1, 0]);
  });

  it('moves focus between marks with the arrow keys, Home, and End', () => {
    const { hook, marks } = setup(4);
    const press = (key: string, from: number) => {
      act(() => {
        hook.result.current.onChartKeyDown({
          key,
          target: marks[from],
          preventDefault: () => undefined,
        } as unknown as KeyboardEvent);
      });
    };
    press('ArrowRight', 0);
    expect(document.activeElement).toBe(marks[1]);
    press('ArrowDown', 1);
    expect(document.activeElement).toBe(marks[2]);
    press('ArrowLeft', 2);
    expect(document.activeElement).toBe(marks[1]);
    press('End', 1);
    expect(document.activeElement).toBe(marks[3]);
    press('ArrowRight', 3);
    expect(document.activeElement).toBe(marks[3]);
    press('Home', 3);
    expect(document.activeElement).toBe(marks[0]);
  });
});
