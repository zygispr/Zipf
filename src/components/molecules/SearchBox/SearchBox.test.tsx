import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { WordEntry } from '../../../lib/types';
import { SearchBox } from './SearchBox';

const entries: WordEntry[] = [
  { word: 'the', count: 1_234, rank: 1, percent: 12.345 },
  { word: "don't", count: 3, rank: 13, percent: 1.3216 },
  { word: 'solo', count: 1, rank: 99, percent: 0.44 },
];

const setup = (hiddenWords?: ReadonlySet<string>) => {
  const user = userEvent.setup();
  render(<SearchBox entries={entries} hiddenWords={hiddenWords} />);
  const input = screen.getByRole('searchbox', { name: 'Find a word' });
  const status = screen.getByRole('status');
  return { user, input, status };
};

describe('SearchBox (FR-021)', () => {
  it('announces results in a polite live region that starts empty', () => {
    const { status } = setup();
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toBeEmptyDOMElement();
  });

  it('shows count, rank, and percent for a hit', async () => {
    const { user, input, status } = setup();
    await user.type(input, 'The');
    expect(status).toHaveTextContent('the: 1,234 times · rank #1 · 12.35%');
  });

  it('finds a word typed with a curly apostrophe', async () => {
    const { user, input, status } = setup();
    await user.type(input, 'don’t');
    expect(status).toHaveTextContent("don't: 3 times · rank #13 · 1.32%");
  });

  it('uses the singular for a word seen once', async () => {
    const { user, input, status } = setup();
    await user.type(input, 'solo');
    expect(status).toHaveTextContent('solo: 1 time · rank #99 · 0.44%');
  });

  it('says when a word is not found', async () => {
    const { user, input, status } = setup();
    await user.type(input, ' zzz ');
    expect(status).toHaveTextContent("“zzz” doesn't appear in this book");
  });

  it('clears the result when the query is cleared', async () => {
    const { user, input, status } = setup();
    await user.type(input, 'the');
    await user.clear(input);
    expect(status).toBeEmptyDOMElement();
  });

  it('says a word is hidden, not missing, while common words are hidden', async () => {
    const { user, input, status } = setup(new Set(['and', "it's"]));
    await user.type(input, 'And');
    expect(status).toHaveTextContent(
      '“And” is a common word, hidden while “Hide common words” is on',
    );
    await user.clear(input);
    await user.type(input, 'it’s');
    expect(status).toHaveTextContent(
      '“it’s” is a common word, hidden while “Hide common words” is on',
    );
    await user.clear(input);
    await user.type(input, 'zzz');
    expect(status).toHaveTextContent("“zzz” doesn't appear in this book");
  });
});
