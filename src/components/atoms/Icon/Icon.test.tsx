import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon, ICON_NAMES } from './Icon';

describe('Icon', () => {
  it('is hidden from assistive technology when it has no label', () => {
    const { container } = render(<Icon name="upload" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('is an image with an accessible name when given a label', () => {
    const { container } = render(<Icon name="alert" label="Error" />);
    expect(screen.getByRole('img', { name: 'Error' })).toBe(container.querySelector('svg'));
    expect(container.querySelector('svg')).not.toHaveAttribute('aria-hidden');
  });

  it('includes the full icon set', () => {
    expect([...ICON_NAMES].sort()).toEqual(
      [
        'alert',
        'book',
        'chart-bar',
        'chevron-left',
        'chevron-right',
        'close',
        'cloud',
        'download',
        'refresh',
        'search',
        'shield',
        'upload',
        'zipf',
      ].sort(),
    );
  });

  it.each(ICON_NAMES)('draws the %s icon', (name) => {
    const { container } = render(<Icon name={name} />);
    expect(container.querySelectorAll('svg path').length).toBeGreaterThan(0);
  });

  it('applies the requested size', () => {
    const { container } = render(<Icon name="book" size={32} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });
});
