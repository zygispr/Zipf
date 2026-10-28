import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  it('provides banner, main, and contentinfo landmarks', () => {
    render(<AppLayout>content</AppLayout>);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('shows the app title as the only level-1 heading, in the header', () => {
    render(<AppLayout>content</AppLayout>);
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('heading', { level: 1, name: 'Zipf' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders its children inside main', () => {
    render(
      <AppLayout>
        <button type="button">Choose a book</button>
      </AppLayout>,
    );
    expect(
      within(screen.getByRole('main')).getByRole('button', { name: 'Choose a book' }),
    ).toBeInTheDocument();
  });

  it('has a one-line footer', () => {
    render(<AppLayout>content</AppLayout>);
    expect(screen.getByRole('contentinfo')).toHaveTextContent(/on your device/i);
  });
});
