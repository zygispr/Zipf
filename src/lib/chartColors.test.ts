import { describe, expect, it } from 'vitest';
import { chartColor } from './chartColors';

describe('chartColor', () => {
  it('cycles through the eight palette tokens', () => {
    expect(chartColor(0)).toBe('var(--chart-1)');
    expect(chartColor(7)).toBe('var(--chart-8)');
    expect(chartColor(8)).toBe('var(--chart-1)');
  });
});
