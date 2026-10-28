import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label in a native button that does not submit forms', () => {
    render(<Button>Choose a book</Button>);
    const button = screen.getByRole('button', { name: 'Choose a book' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is reachable with Tab', async () => {
    const user = userEvent.setup();
    render(<Button>Go</Button>);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Go' })).toHaveFocus();
  });

  it.each(['primary', 'secondary', 'ghost'] as const)('renders the %s variant', (variant) => {
    render(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('data-variant', variant);
  });

  it('defaults to the primary variant', () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('data-variant', 'primary');
  });

  it('renders a leading icon before the label', () => {
    render(<Button leadingIcon={<svg data-testid="icon" aria-hidden="true" />}>Upload</Button>);
    const button = screen.getByRole('button', { name: 'Upload' });
    expect(button.firstElementChild).toBe(screen.getByTestId('icon'));
  });
});
