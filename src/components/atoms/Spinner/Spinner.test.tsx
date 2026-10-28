import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('is a status with a visually hidden label', () => {
    render(<Spinner label="Analyzing your book" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Analyzing your book');
    expect(screen.getByText('Analyzing your book')).toHaveClass('visually-hidden');
  });

  it('defaults its label to "Loading"', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('hides the decorative ring from assistive technology', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
