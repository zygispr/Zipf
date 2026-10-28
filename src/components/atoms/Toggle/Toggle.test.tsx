import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Toggle, type ToggleProps } from './Toggle';

function Controlled({ onChange = vi.fn(), ...rest }: Partial<ToggleProps>) {
  const [checked, setChecked] = useState(false);
  return (
    <Toggle
      label="Hide common words"
      {...rest}
      checked={checked}
      onChange={(next) => {
        setChecked(next);
        onChange(next);
      }}
    />
  );
}

const toggle = () => screen.getByRole('switch', { name: 'Hide common words' });

describe('Toggle', () => {
  it('is a labelled switch reflecting its state in aria-checked', () => {
    render(<Toggle label="Hide common words" checked={false} onChange={vi.fn()} />);
    expect(toggle()).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles on click', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await userEvent.click(toggle());
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(toggle()).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(toggle());
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(toggle()).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles with Space and Enter', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.tab();
    expect(toggle()).toHaveFocus();
    await user.keyboard(' ');
    expect(toggle()).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Enter}');
    expect(toggle()).toHaveAttribute('aria-checked', 'false');
  });

  it('links its description', () => {
    render(<Controlled description="Removes words like “the” and “and”." />);
    expect(toggle()).toHaveAccessibleDescription('Removes words like “the” and “and”.');
  });

  it('when disabled, stays focusable, explains why, and ignores clicks and keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Controlled
        disabled
        description="Common-word filtering is available for English books"
        onChange={onChange}
      />,
    );
    expect(toggle()).toHaveAttribute('aria-disabled', 'true');
    expect(toggle()).toHaveAccessibleDescription(
      'Common-word filtering is available for English books',
    );
    await user.tab();
    expect(toggle()).toHaveFocus();
    await user.keyboard(' {Enter}');
    await user.click(toggle());
    expect(onChange).not.toHaveBeenCalled();
    expect(toggle()).toHaveAttribute('aria-checked', 'false');
  });
});
