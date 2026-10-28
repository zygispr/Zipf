import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { Heading } from './Heading';

describe('Heading', () => {
  it.each([1, 2, 3] as const)('renders level %i as the matching h element', (level) => {
    render(<Heading level={level}>Results</Heading>);
    const heading = screen.getByRole('heading', { level, name: 'Results' });
    expect(heading.tagName).toBe(`H${String(level)}`);
  });

  it('passes tabIndex through so focus can be moved to it', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(
      <Heading level={2} tabIndex={-1} ref={ref}>
        Results
      </Heading>,
    );
    const heading = screen.getByRole('heading', { name: 'Results' });
    expect(heading).toHaveAttribute('tabindex', '-1');
    ref.current?.focus();
    expect(heading).toHaveFocus();
  });
});
