import { useId, useRef, useState, type DragEvent, type Ref } from 'react';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Text } from '../../atoms/Text';
import styles from './FileDropZone.module.scss';

export interface FileDropZoneProps {
  onFile: (file: File) => void;
  /** Points at the "Choose a book" button, the zone's single focus target. */
  ref?: Ref<HTMLButtonElement>;
}

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files');

/**
 * Drop a book here or pick one (FR-001). The real button's click area is stretched over the whole
 * zone, so there is one native, keyboard-operable control instead of nested interactive elements.
 */
export function FileDropZone({ onFile, ref }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const titleId = useId();

  const onDragEnter = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };
  const onDragOver = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
  };
  const onDragLeave = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };
  const onDrop = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    // The page-wide drop handler must not process the same file again.
    event.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      data-dragging={isDragging}
      className={styles.zone}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className={styles.icon}>
        <Icon name="upload" size={40} />
      </span>
      <Text variant="lead" id={titleId} className={styles.title}>
        Drop a book here
      </Text>
      <Text variant="caption">A .txt or .epub file, up to 50 MB</Text>
      <Button
        ref={ref}
        className={styles.choose}
        leadingIcon={<Icon name="book" />}
        onClick={() => inputRef.current?.click()}
      >
        Choose a book
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.epub"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          // Reset so choosing the same file again still triggers a change.
          event.currentTarget.value = '';
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
