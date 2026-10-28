import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'motion/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Tooltip } from './Tooltip';

function Anchored() {
  const [open, setOpen] = useState(false);
  return (
    <MotionConfig reducedMotion="always">
      <button
        type="button"
        aria-describedby={open ? 'tip' : undefined}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
        }}
      >
        Anchor
      </button>
      <Tooltip
        id="tip"
        open={open}
        x={10}
        y={20}
        onDismiss={() => {
          setOpen(false);
        }}
      >
        Details
      </Tooltip>
    </MotionConfig>
  );
}

describe('Tooltip', () => {
  it('shows a positioned tooltip when its anchor is focused', async () => {
    const user = userEvent.setup();
    render(<Anchored />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await user.tab();
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Details');
    expect(tooltip).toHaveAttribute('id', 'tip');
    expect(tooltip).toHaveStyle({ left: '10px', top: '20px' });
    expect(screen.getByRole('button', { name: 'Anchor' })).toHaveAccessibleDescription('Details');
  });

  it('is dismissed with Escape', async () => {
    const user = userEvent.setup();
    render(<Anchored />);
    await user.tab();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('does not react to Escape while closed', async () => {
    const onDismiss = vi.fn();
    render(
      <Tooltip id="t" open={false} x={0} y={0} onDismiss={onDismiss}>
        Hidden
      </Tooltip>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
