import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrivacyNote } from './PrivacyNote';

describe('PrivacyNote', () => {
  it('states the privacy guarantee (FR-005)', () => {
    render(<PrivacyNote />);
    expect(
      screen.getByText('Your book never leaves your device and is not saved'),
    ).toBeInTheDocument();
  });
});
