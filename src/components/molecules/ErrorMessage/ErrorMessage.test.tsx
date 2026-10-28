import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ERROR_MESSAGES } from '../../../lib/errorMessages';
import type { AnalysisErrorCode } from '../../../lib/types';
import { ErrorMessage } from './ErrorMessage';

const CODES: AnalysisErrorCode[] = ['unsupported', 'too-large', 'empty', 'corrupted', 'protected'];

describe('ErrorMessage', () => {
  it.each(CODES)('announces the plain-language message for %s', (code) => {
    render(<ErrorMessage code={code} onRetry={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(ERROR_MESSAGES[code]);
  });

  it('offers "Choose another book"', async () => {
    const onRetry = vi.fn();
    render(<ErrorMessage code="empty" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Choose another book' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
