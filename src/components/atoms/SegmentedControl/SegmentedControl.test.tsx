import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

const OPTIONS = [
  { value: 'bar', label: 'Bar chart' },
  { value: 'cloud', label: 'Word cloud' },
  { value: 'zipf', label: "Zipf's law" },
] as const;
type View = (typeof OPTIONS)[number]['value'];

function Controlled({ onChange = vi.fn() }: { onChange?: (value: View) => void }) {
  const [value, setValue] = useState<View>('bar');
  return (
    <SegmentedControl
      label="Visualization"
      options={OPTIONS}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

const radio = (name: string) => screen.getByRole('radio', { name });

describe('SegmentedControl', () => {
  it('is a labelled radio group with the current value checked', () => {
    render(<Controlled />);
    expect(screen.getByRole('radiogroup', { name: 'Visualization' })).toBeInTheDocument();
    expect(radio('Bar chart')).toHaveAttribute('aria-checked', 'true');
    expect(radio('Word cloud')).toHaveAttribute('aria-checked', 'false');
  });

  it('has a single tab stop on the checked option', () => {
    render(<Controlled />);
    expect(radio('Bar chart')).toHaveAttribute('tabindex', '0');
    expect(radio('Word cloud')).toHaveAttribute('tabindex', '-1');
    expect(radio("Zipf's law")).toHaveAttribute('tabindex', '-1');
  });

  it('selects an option on click', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await userEvent.click(radio('Word cloud'));
    expect(onChange).toHaveBeenCalledWith('cloud');
    expect(radio('Word cloud')).toHaveAttribute('aria-checked', 'true');
  });

  it('moves and selects with the arrow keys, wrapping around', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(radio('Word cloud')).toHaveFocus();
    expect(radio('Word cloud')).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowDown}{ArrowRight}');
    expect(radio('Bar chart')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(radio("Zipf's law")).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(radio('Word cloud')).toHaveAttribute('aria-checked', 'true');
  });

  it('jumps to the first and last option with Home and End', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.tab();
    await user.keyboard('{End}');
    expect(radio("Zipf's law")).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Home}');
    expect(radio('Bar chart')).toHaveAttribute('aria-checked', 'true');
  });
});
