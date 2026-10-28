import { useEffect, useEffectEvent, useState } from 'react';

const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;

/**
 * Accepts a book dropped anywhere on the page, in any state (FR-001), and reports whether a file
 * is being dragged over the page so an overlay can be shown.
 */
export function usePageFileDrop(onFile: (file: File) => void): boolean {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const handleFile = useEffectEvent(onFile);

  useEffect(() => {
    // dragenter/dragleave fire for every nested element, so count them to avoid flicker.
    let depth = 0;
    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setIsDraggingFile(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDraggingFile(false);
    };
    // Capture phase, so the overlay also closes when a drop zone stops the drop from bubbling.
    const onDropCapture = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = 0;
      setIsDraggingFile(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      // Without this the browser would navigate to the dropped file.
      event.preventDefault();
      const file = event.dataTransfer?.files[0];
      if (file) handleFile(file);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDropCapture, true);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDropCapture, true);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return isDraggingFile;
}
