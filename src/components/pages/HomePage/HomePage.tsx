import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo, type ReactNode } from 'react';
import { Heading } from '../../atoms/Heading';
import { DropOverlay } from '../../molecules/DropOverlay';
import { ProcessingPanel } from '../../organisms/ProcessingPanel';
import { ResultsToolbar } from '../../organisms/ResultsToolbar';
import { SummaryStats } from '../../organisms/SummaryStats';
import { UploadPanel } from '../../organisms/UploadPanel';
import { WordTable } from '../../organisms/WordTable';
import { ResultsLayout } from '../../templates/ResultsLayout';
import { useAnalysis, type WorkerLike } from '../../../hooks/useAnalysis';
import { usePageFileDrop } from '../../../hooks/usePageFileDrop';
import { selectView } from '../../../lib/selectView';
import { DEFAULT_VIEW_SETTINGS } from '../../../lib/types';

export interface HomePageProps {
  /** Injected in tests; the real analysis worker by default. */
  createWorker?: () => WorkerLike;
}

/** The only component connected to app state (research R14). */
export function HomePage({ createWorker }: HomePageProps) {
  const { state, selectFile, cancel, reset } = useAnalysis({ createWorker });
  const isDraggingFile = usePageFileDrop(selectFile);

  const result = state.status === 'results' ? state.result : null;
  const view = useMemo(() => result && selectView(result, DEFAULT_VIEW_SETTINGS), [result]);

  // Stable, so it focuses the results heading once, when it mounts (FR-018).
  const focusOnMount = useCallback((element: HTMLElement | null) => {
    element?.focus();
  }, []);

  let panelKey: string;
  let panel: ReactNode;
  switch (state.status) {
    case 'idle':
    case 'error':
      // One key for both, so showing an error doesn't animate the upload panel away.
      panelKey = 'upload';
      panel = (
        <UploadPanel
          onFile={selectFile}
          errorCode={state.status === 'error' ? state.code : undefined}
          onRetry={reset}
        />
      );
      break;
    case 'processing':
      panelKey = 'processing';
      panel = (
        <ProcessingPanel
          fileName={state.fileName}
          stage={state.stage}
          progress={state.progress}
          onCancel={cancel}
          onFile={selectFile}
        />
      );
      break;
    case 'results':
      panelKey = 'results';
      panel = (
        <ResultsLayout
          heading={
            <Heading level={2} tabIndex={-1} ref={focusOnMount}>
              {state.result.bookName}
            </Heading>
          }
          toolbar={<ResultsToolbar onNewBook={reset} />}
          stats={
            <SummaryStats
              totalWords={state.result.totalWords}
              distinctWords={state.result.distinctWords}
              topEntry={state.result.entries[0]}
            />
          }
          table={view && <WordTable entries={view.entries} />}
        />
      );
      break;
  }

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={panelKey}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {panel}
        </motion.div>
      </AnimatePresence>
      <DropOverlay visible={isDraggingFile} />
    </>
  );
}
