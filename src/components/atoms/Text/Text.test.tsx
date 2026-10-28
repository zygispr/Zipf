import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Text } from './Text';

describe('Text', () => {
  it('renders a paragraph with the body variant by default', () => {
    render(<Text>Hello</Text>);
    const text = screen.getByText('Hello');
    expect(text.tagName).toBe('P');
    expect(text).toHaveAttribute('data-variant', 'body');
  });

  it('renders as a span when asked', () => {
    render(<Text as="span">Inline</Text>);
    expect(screen.getByText('Inline').tagName).toBe('SPAN');
  });

  it.each(['body', 'caption', 'lead'] as const)('renders the %s variant', (variant) => {
    render(<Text variant={variant}>Styled</Text>);
    expect(screen.getByText('Styled')).toHaveAttribute('data-variant', variant);
  });
});
