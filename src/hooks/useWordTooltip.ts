// Shared by the three charts (FR-015): which word's tooltip is open, where, and how the chart's
// marks are reached with the keyboard.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

export interface TooltipPosition {
  /** Horizontal center of the mark, relative to the chart container. */
  x: number;
  /** Top edge of the mark, relative to the chart container. */
  y: number;
}

/** Keeps a tooltip of about this half-width inside the chart. */
const EDGE_MARGIN = 90;

const STEP_KEYS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

export function useWordTooltip(markCount: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipId = useId();
  const [active, setActive] = useState<{ word: string; position: TooltipPosition } | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  // A tap also focuses the mark; the tap itself decides whether the tooltip opens.
  const touchInProgress = useRef(false);

  const positionOf = useCallback((mark: Element): TooltipPosition => {
    const box = mark.getBoundingClientRect();
    const origin = containerRef.current?.getBoundingClientRect();
    if (!origin) return { x: 0, y: 0 };
    const x = box.left + box.width / 2 - origin.left;
    const margin = Math.min(EDGE_MARGIN, origin.width / 2);
    return { x: Math.min(Math.max(x, margin), origin.width - margin), y: box.top - origin.top };
  }, []);

  const show = useCallback(
    (word: string, mark: Element) => {
      setActive({ word, position: positionOf(mark) });
    },
    [positionOf],
  );

  const hide = useCallback((word: string) => {
    setActive((current) => (current?.word === word ? null : current));
  }, []);

  const dismiss = useCallback(() => {
    setActive(null);
  }, []);

  // Tapping anywhere outside the chart closes the tooltip.
  const isOpen = active !== null;
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen]);

  const tabStop = Math.min(focusIndex, Math.max(0, markCount - 1));

  const getWordProps = (word: string, index: number) => ({
    // One tab stop per chart; the arrow keys move between marks (onChartKeyDown).
    tabIndex: index === tabStop ? 0 : -1,
    'data-word-index': index,
    'aria-describedby': active?.word === word ? tooltipId : undefined,
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === 'mouse') show(word, event.currentTarget);
    },
    onPointerLeave: (event: PointerEvent) => {
      if (event.pointerType === 'mouse') hide(word);
    },
    onPointerDown: (event: PointerEvent) => {
      touchInProgress.current = event.pointerType === 'touch';
    },
    onPointerUp: (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      touchInProgress.current = false;
      const position = positionOf(event.currentTarget);
      setActive((current) => (current?.word === word ? null : { word, position }));
    },
    onFocus: (event: FocusEvent) => {
      setFocusIndex(index);
      if (!touchInProgress.current) show(word, event.currentTarget);
    },
    onBlur: () => {
      hide(word);
    },
  });

  const onChartKeyDown = (event: KeyboardEvent) => {
    const current = Number((event.target as HTMLElement | SVGElement).dataset.wordIndex);
    if (Number.isNaN(current) || markCount === 0) return;
    const step = STEP_KEYS[event.key];
    let next: number;
    if (step !== undefined) next = Math.min(Math.max(current + step, 0), markCount - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = markCount - 1;
    else return;
    event.preventDefault();
    containerRef.current
      ?.querySelector<HTMLElement | SVGElement>(`[data-word-index="${String(next)}"]`)
      ?.focus();
  };

  return {
    containerRef,
    tooltipId,
    activeWord: active?.word ?? null,
    position: active?.position ?? { x: 0, y: 0 },
    getWordProps,
    onChartKeyDown,
    dismiss,
  };
}
