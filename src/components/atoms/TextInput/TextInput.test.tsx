import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TextInput } from './TextInput';

describe('TextInput', () => {
  it('has an associated label', () => {
    render(<TextInput label="Your name" />);
    const input = screen.getByLabelText('Your name');
    expect(input.tagName).toBe('INPUT');
    expect(screen.getByRole('textbox', { name: 'Your name' })).toBe(input);
  });

  it('supports type="search"', () => {
    render(<TextInput label="Find a word" type="search" />);
    expect(screen.getByRole('searchbox', { name: 'Find a word' })).toBeInTheDocument();
  });

  it('passes value changes to onChange', async () => {
    const onChange = vi.fn();
    render(<TextInput label="Find a word" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Find a word'), 'cat');
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('shows a decorative leading icon', () => {
    render(<TextInput label="Find a word" leadingIcon={<svg data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Find a word' })).toBeInTheDocument();
  });
});
