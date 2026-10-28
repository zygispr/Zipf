import { act, fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePageFileDrop } from './usePageFileDrop';

const book = new File(['words'], 'book.txt');
const fileDrag = (files: File[] = []) => ({ dataTransfer: { files, types: ['Files'] } });

describe('usePageFileDrop', () => {
  it('reports a file being dragged over the page, ignoring nested enter/leave pairs', () => {
    const { result } = renderHook(() => usePageFileDrop(vi.fn()));
    expect(result.current).toBe(false);
    act(() => {
      fireEvent.dragEnter(window, fileDrag());
      fireEvent.dragEnter(window, fileDrag());
      fireEvent.dragLeave(window, fileDrag());
    });
    expect(result.current).toBe(true);
    act(() => {
      fireEvent.dragLeave(window, fileDrag());
    });
    expect(result.current).toBe(false);
  });

  it('passes the first dropped file to onFile', () => {
    const onFile = vi.fn();
    const { result } = renderHook(() => usePageFileDrop(onFile));
    act(() => {
      fireEvent.dragEnter(window, fileDrag());
      fireEvent.drop(window, fileDrag([book, new File(['x'], 'b.txt')]));
    });
    expect(onFile).toHaveBeenCalledExactlyOnceWith(book);
    expect(result.current).toBe(false);
  });

  it('prevents the browser from opening dropped files, but only for file drags', () => {
    renderHook(() => usePageFileDrop(vi.fn()));
    expect(fireEvent.dragOver(window, fileDrag())).toBe(false);
    expect(fireEvent.drop(window, fileDrag([book]))).toBe(false);
    expect(fireEvent.dragOver(window, { dataTransfer: { files: [], types: ['text/plain'] } })).toBe(
      true,
    );
  });

  it('clears the dragging state even when a drop zone stops the drop from bubbling', () => {
    const onFile = vi.fn();
    const zone = document.createElement('div');
    zone.addEventListener('drop', (event) => {
      event.stopPropagation();
    });
    document.body.append(zone);
    const { result } = renderHook(() => usePageFileDrop(onFile));
    act(() => {
      fireEvent.dragEnter(zone, fileDrag());
      fireEvent.drop(zone, fileDrag([book]));
    });
    zone.remove();
    expect(result.current).toBe(false);
    expect(onFile).not.toHaveBeenCalled();
  });

  it('removes its listeners on unmount', () => {
    const onFile = vi.fn();
    const { unmount } = renderHook(() => usePageFileDrop(onFile));
    unmount();
    fireEvent.drop(window, fileDrag([book]));
    expect(onFile).not.toHaveBeenCalled();
  });
});
