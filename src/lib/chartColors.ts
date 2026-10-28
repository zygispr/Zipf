const PALETTE_SIZE = 8;

/** The categorical chart color for the item at `index`, cycling through --chart-1…--chart-8. */
export function chartColor(index: number): string {
  return `var(--chart-${String((index % PALETTE_SIZE) + 1)})`;
}
