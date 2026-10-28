import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo, type ReactNode } from 'react';
import { Heading } from '../../atoms/Heading';
import { DropOverlay } from '../../molecules/DropOverlay';
import { SearchBox } from '../../molecules/SearchBox';
import { ProcessingPanel } from '../../organisms/ProcessingPanel';
import { ResultsToolbar } from '../../organisms/ResultsToolbar';
import { SummaryStats } from '../../organisms/SummaryStats';
import { UploadPanel } from '../../organisms/UploadPanel';
import { VisualizationPanel } from '../../organisms/VisualizationPanel';
import { WordTable } from '../../organisms/WordTable';
import { ResultsLayout } from '../../templates/ResultsLayout';
import { useAnalysis, type WorkerLike } from '../../../hooks/useAnalysis';
import { usePageFileDrop } from '../../../hooks/usePageFileDrop';
import { useViewSettings } from '../../../hooks/useViewSettings';
import { csvFilename, toCsv } from '../../../lib/csv';
import { downloadTextFile } from '../../../lib/download';
import { selectView } from '../../../lib/selectView';
import type { FrequencyResult } from '../../../lib/types';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

const WORD_TABLE_ID = 'word-table';

const BOOK_TOTALS_NOTE = 'These are book totals, including the hidden common words.';

interface ResultsScreenProps {
  result: FrequencyResult;
  onNewBook: () => void;
}

/** Mounted once per result, so view settings start from the defaults for every book. */
function ResultsScreen({ result, onNewBook }: ResultsScreenProps) {
  const [settings, actions] = useViewSettings(result.isLikelyEnglish);
  const { topN, hideCommonWords } = settings;
  // Switching visualizations doesn't change the view, so the table and charts keep their props.
  const view = useMemo(
    () => selectView(result, { topN, hideCommonWords }),
    [result, topN, hideCommonWords],
  );

  // Stable, so it focuses the results heading once, when it mounts (FR-018).
  const focusOnMount = useCallback((element: HTMLElement | null) => {
    element?.focus();
  }, []);

  return (
    <ResultsLayout
      heading={
        <Heading level={2} tabIndex={-1} ref={focusOnMount}>
          {result.bookName}
        </Heading>
      }
      toolbar={
        <ResultsToolbar
          visualization={settings.visualization}
          onVisualizationChange={actions.setVisualization}
          topN={topN}
          onTopNChange={actions.setTopN}
          hideCommonWords={hideCommonWords}
          onHideCommonWordsChange={actions.setHideCommonWords}
          canHideCommonWords={result.isLikelyEnglish}
          onDownload={() => {
            downloadTextFile(toCsv(view.entries), csvFilename(result.bookName));
          }}
          onNewBook={onNewBook}
        />
      }
      stats={
        <SummaryStats
          totalWords={result.totalWords}
          distinctWords={result.distinctWords}
          topEntry={result.entries[0]}
          note={hideCommonWords ? BOOK_TOTALS_NOTE : undefined}
        />
      }
      visualization={
        <VisualizationPanel
          visualization={settings.visualization}
          view={view}
          tableId={WORD_TABLE_ID}
        />
      }
      search={<SearchBox entries={view.entries} hiddenWords={view.hiddenWords} />}
      // A new key remounts the table, so changing the filter goes back to page 1 (research R14).
      table={<WordTable key={String(hideCommonWords)} id={WORD_TABLE_ID} entries={view.entries} />}
    />
  );
}

export interface HomePageProps {
  /** Injected in tests; the real analysis worker by default. */
  createWorker?: () => WorkerLike;
}

/** The only component connected to app state (research R14). */
export function HomePage({ createWorker }: HomePageProps) {
  const { state, selectFile, cancel, reset } = useAnalysis({ createWorker });
  const isDraggingFile = usePageFileDrop(selectFile);
  const reduceMotion = useReducedMotion();

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
      panel = <ResultsScreen result={state.result} onNewBook={reset} />;
      break;
  }

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={panelKey}
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -16 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
        >
          {panel}
        </motion.div>
      </AnimatePresence>
      <DropOverlay visible={isDraggingFile} />
    </>
  );
}
