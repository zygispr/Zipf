// View settings reducer (data model ViewSettings, research R14). Owned by the results screen, which
// mounts fresh for every result, so a new book always starts from the defaults.
import { useMemo, useReducer } from 'react';
import {
  DEFAULT_VIEW_SETTINGS,
  type TopN,
  type ViewSettings,
  type VisualizationType,
} from '../lib/types';

export type ViewSettingsAction =
  | { type: 'setVisualization'; visualization: VisualizationType }
  | { type: 'setTopN'; topN: TopN }
  | { type: 'setHideCommonWords'; hideCommonWords: boolean; isLikelyEnglish: boolean }
  | { type: 'reset' };

export function viewSettingsReducer(state: ViewSettings, action: ViewSettingsAction): ViewSettings {
  switch (action.type) {
    case 'setVisualization':
      return { ...state, visualization: action.visualization };
    case 'setTopN':
      return { ...state, topN: action.topN };
    case 'setHideCommonWords':
      // Common words can only be hidden for books that look English (FR-019).
      if (action.hideCommonWords && !action.isLikelyEnglish) return state;
      return { ...state, hideCommonWords: action.hideCommonWords };
    case 'reset':
      return DEFAULT_VIEW_SETTINGS;
  }
}

export interface ViewSettingsActions {
  setVisualization: (visualization: VisualizationType) => void;
  setTopN: (topN: TopN) => void;
  setHideCommonWords: (hideCommonWords: boolean) => void;
  reset: () => void;
}

export function useViewSettings(isLikelyEnglish: boolean) {
  const [settings, dispatch] = useReducer(viewSettingsReducer, DEFAULT_VIEW_SETTINGS);
  const actions = useMemo<ViewSettingsActions>(
    () => ({
      setVisualization: (visualization) => {
        dispatch({ type: 'setVisualization', visualization });
      },
      setTopN: (topN) => {
        dispatch({ type: 'setTopN', topN });
      },
      setHideCommonWords: (hideCommonWords) => {
        dispatch({ type: 'setHideCommonWords', hideCommonWords, isLikelyEnglish });
      },
      reset: () => {
        dispatch({ type: 'reset' });
      },
    }),
    [isLikelyEnglish],
  );
  return [settings, actions] as const;
}
