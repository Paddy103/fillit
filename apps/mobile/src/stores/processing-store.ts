/**
 * Processing pipeline state machine Zustand store.
 *
 * Manages the runtime processing pipeline for documents through stages:
 * idle -> scanning -> reviewing -> ocr -> detecting -> matching -> signing -> exporting -> done.
 *
 * This store is ephemeral (no SQLite persistence) — the document store handles
 * persisted status. This store tracks the live pipeline state, progress, pause/
 * resume, and error recovery.
 */

import type { PipelineStage, ProcessingStatus } from '@fillit/shared';
import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_STAGE_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  idle: ['scanning'],
  scanning: ['reviewing'],
  reviewing: ['ocr'],
  ocr: ['detecting'],
  detecting: ['matching'],
  matching: ['signing'],
  signing: ['exporting'],
  exporting: ['done'],
  done: ['idle'],
};

const STAGE_TO_STATUS: Partial<Record<PipelineStage, ProcessingStatus>> = {
  scanning: 'scanned',
  ocr: 'ocr_complete',
  detecting: 'fields_detected',
  matching: 'matched',
  signing: 'reviewed',
  done: 'exported',
};

const PIPELINE_STAGES: PipelineStage[] = [
  'idle',
  'scanning',
  'reviewing',
  'ocr',
  'detecting',
  'matching',
  'signing',
  'exporting',
  'done',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StageProgressInfo {
  startedAt: string;
  completedAt?: string;
  progress: number;
}

export interface StageTransition {
  from: PipelineStage;
  to: PipelineStage;
  timestamp: string;
}

export interface ProcessingStoreError {
  operation: ProcessingOperation;
  message: string;
  stage: PipelineStage;
  cause?: unknown;
}

export type ProcessingOperation =
  | 'transition'
  | 'start'
  | 'pause'
  | 'resume'
  | 'reset'
  | 'updateProgress';

export interface ProcessingState {
  currentStage: PipelineStage;
  documentId: string | null;
  stageProgress: Partial<Record<PipelineStage, StageProgressInfo>>;
  isPaused: boolean;
  error: ProcessingStoreError | null;
  stageHistory: StageTransition[];
}

export interface ProcessingActions {
  startProcessing: (documentId: string) => void;
  advanceStage: () => void;
  transitionTo: (stage: PipelineStage) => void;
  updateProgress: (progress: number) => void;
  completeCurrentStage: () => void;
  pause: () => void;
  resume: () => void;
  handleError: (operation: ProcessingOperation, error: unknown) => void;
  retry: () => void;
  reset: () => void;
  clearError: () => void;
}

export type ProcessingStore = ProcessingState & ProcessingActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_PROCESSING_STATE: ProcessingState = {
  currentStage: 'idle',
  documentId: null,
  stageProgress: {},
  isPaused: false,
  error: null,
  stageHistory: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SetFn = {
  (
    partial: Partial<ProcessingStore> | ((state: ProcessingStore) => Partial<ProcessingStore>),
  ): void;
};
type GetFn = () => ProcessingStore;

function toProcessingError(
  operation: ProcessingOperation,
  stage: PipelineStage,
  err: unknown,
): ProcessingStoreError {
  return {
    operation,
    message: err instanceof Error ? err.message : String(err),
    stage,
    cause: err,
  };
}

function isValidTransition(from: PipelineStage, to: PipelineStage): boolean {
  return VALID_STAGE_TRANSITIONS[from].includes(to);
}

function initStageProgress(): StageProgressInfo {
  return {
    startedAt: new Date().toISOString(),
    progress: 0,
  };
}

function recordTransition(from: PipelineStage, to: PipelineStage): StageTransition {
  return {
    from,
    to,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Action factories
// ---------------------------------------------------------------------------

function createLifecycleActions(set: SetFn, get: GetFn) {
  return {
    startProcessing: (documentId: string) => {
      const { currentStage } = get();
      if (currentStage !== 'idle') {
        const err = new Error(
          `Cannot start processing: current stage is "${currentStage}", expected "idle"`,
        );
        set({
          error: toProcessingError('start', currentStage, err),
        });
        return;
      }

      const now = new Date().toISOString();
      set({
        documentId,
        currentStage: 'scanning',
        stageProgress: { scanning: { startedAt: now, progress: 0 } },
        isPaused: false,
        error: null,
        stageHistory: [{ from: 'idle', to: 'scanning', timestamp: now }],
      });
    },

    reset: () => {
      set({ ...DEFAULT_PROCESSING_STATE });
    },
  };
}

function createTransitionActions(set: SetFn, get: GetFn) {
  return {
    advanceStage: () => {
      const { currentStage, isPaused, error } = get();
      if (isPaused) {
        set({
          error: toProcessingError(
            'transition',
            currentStage,
            new Error('Cannot advance: processing is paused'),
          ),
        });
        return;
      }
      if (error) {
        set({
          error: toProcessingError(
            'transition',
            currentStage,
            new Error('Cannot advance: unresolved error'),
          ),
        });
        return;
      }

      const nextStages = VALID_STAGE_TRANSITIONS[currentStage];
      if (nextStages.length === 0) {
        set({
          error: toProcessingError(
            'transition',
            currentStage,
            new Error(`No valid transition from "${currentStage}"`),
          ),
        });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length checked above
      const nextStage = nextStages[0]!;
      set((s) => {
        const completedProgress = s.stageProgress[s.currentStage];
        const updatedCurrentProgress: StageProgressInfo = completedProgress
          ? {
              ...completedProgress,
              progress: 1,
              completedAt: completedProgress.completedAt ?? new Date().toISOString(),
            }
          : {
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              progress: 1,
            };

        return {
          currentStage: nextStage,
          stageProgress: {
            ...s.stageProgress,
            [s.currentStage]: updatedCurrentProgress,
            [nextStage]: initStageProgress(),
          },
          stageHistory: [...s.stageHistory, recordTransition(s.currentStage, nextStage)],
        };
      });
    },

    transitionTo: (stage: PipelineStage) => {
      const { currentStage, isPaused, error } = get();
      if (isPaused) {
        set({
          error: toProcessingError(
            'transition',
            currentStage,
            new Error('Cannot transition: processing is paused'),
          ),
        });
        return;
      }
      if (error) {
        set({
          error: toProcessingError(
            'transition',
            currentStage,
            new Error('Cannot transition: unresolved error'),
          ),
        });
        return;
      }

      if (!isValidTransition(currentStage, stage)) {
        set({
          error: toProcessingError(
            'transition',
            currentStage,
            new Error(`Invalid transition from "${currentStage}" to "${stage}"`),
          ),
        });
        return;
      }

      set((s) => {
        const completedProgress = s.stageProgress[s.currentStage];
        const updatedCurrentProgress: StageProgressInfo = completedProgress
          ? {
              ...completedProgress,
              progress: 1,
              completedAt: completedProgress.completedAt ?? new Date().toISOString(),
            }
          : {
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              progress: 1,
            };

        return {
          currentStage: stage,
          stageProgress: {
            ...s.stageProgress,
            [s.currentStage]: updatedCurrentProgress,
            [stage]: initStageProgress(),
          },
          stageHistory: [...s.stageHistory, recordTransition(s.currentStage, stage)],
        };
      });
    },
  };
}

function createProgressActions(set: SetFn, get: GetFn) {
  return {
    updateProgress: (progress: number) => {
      const { currentStage } = get();
      const clamped = Math.max(0, Math.min(1, progress));

      set((s) => {
        const existing = s.stageProgress[currentStage];
        if (!existing) return {};

        return {
          stageProgress: {
            ...s.stageProgress,
            [currentStage]: { ...existing, progress: clamped },
          },
        };
      });
    },

    completeCurrentStage: () => {
      const { currentStage } = get();

      set((s) => {
        const existing = s.stageProgress[currentStage];
        if (!existing) return {};

        return {
          stageProgress: {
            ...s.stageProgress,
            [currentStage]: {
              ...existing,
              progress: 1,
              completedAt: existing.completedAt ?? new Date().toISOString(),
            },
          },
        };
      });
    },
  };
}

function createPauseResumeActions(set: SetFn, get: GetFn) {
  return {
    pause: () => {
      const { currentStage, isPaused } = get();
      if (currentStage === 'idle' || currentStage === 'done' || isPaused) {
        set({
          error: toProcessingError(
            'pause',
            currentStage,
            new Error(isPaused ? 'Already paused' : `Cannot pause in "${currentStage}" stage`),
          ),
        });
        return;
      }

      set({ isPaused: true });
    },

    resume: () => {
      const { isPaused, currentStage } = get();
      if (!isPaused) {
        set({
          error: toProcessingError('resume', currentStage, new Error('Cannot resume: not paused')),
        });
        return;
      }

      set({ isPaused: false });
    },
  };
}

function createErrorActions(set: SetFn, get: GetFn) {
  return {
    handleError: (operation: ProcessingOperation, error: unknown) => {
      const { currentStage } = get();
      set({
        error: toProcessingError(operation, currentStage, error),
      });
    },

    retry: () => {
      const { currentStage } = get();
      set((s) => ({
        error: null,
        stageProgress: {
          ...s.stageProgress,
          [currentStage]: initStageProgress(),
        },
      }));
    },

    clearError: () => {
      set({ error: null });
    },
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProcessingStore = create<ProcessingStore>()(createProcessingStore);

function createProcessingStore(set: SetFn, get: GetFn): ProcessingStore {
  return {
    ...DEFAULT_PROCESSING_STATE,
    ...createLifecycleActions(set, get),
    ...createTransitionActions(set, get),
    ...createProgressActions(set, get),
    ...createPauseResumeActions(set, get),
    ...createErrorActions(set, get),
  };
}

// ---------------------------------------------------------------------------
// Selectors — basic state
// ---------------------------------------------------------------------------

export const selectCurrentStage = (state: ProcessingStore): PipelineStage => state.currentStage;

export const selectDocumentId = (state: ProcessingStore): string | null => state.documentId;

export const selectIsPaused = (state: ProcessingStore): boolean => state.isPaused;

export const selectError = (state: ProcessingStore): ProcessingStoreError | null => state.error;

export const selectStageHistory = (state: ProcessingStore): StageTransition[] => state.stageHistory;

// ---------------------------------------------------------------------------
// Selectors — derived state
// ---------------------------------------------------------------------------

export const selectIsProcessing = (state: ProcessingStore): boolean =>
  state.currentStage !== 'idle' && state.currentStage !== 'done' && !state.isPaused;

export const selectIsIdle = (state: ProcessingStore): boolean => state.currentStage === 'idle';

export const selectIsDone = (state: ProcessingStore): boolean => state.currentStage === 'done';

export const selectCanAdvance = (state: ProcessingStore): boolean => {
  if (state.isPaused || state.error) return false;
  const nextStages = VALID_STAGE_TRANSITIONS[state.currentStage];
  return nextStages.length > 0;
};

export const selectNextStage = (state: ProcessingStore): PipelineStage | null => {
  const nextStages = VALID_STAGE_TRANSITIONS[state.currentStage];
  return nextStages.length > 0 ? (nextStages[0] ?? null) : null;
};

export const selectCurrentProgress = (state: ProcessingStore): StageProgressInfo | null =>
  state.stageProgress[state.currentStage] ?? null;

export const selectOverallProgress = (state: ProcessingStore): number => {
  // Total actionable stages (exclude idle)
  const actionableStages = PIPELINE_STAGES.filter((s) => s !== 'idle');
  const total = actionableStages.length;
  if (total === 0) return 0;

  let completed = 0;
  for (const stage of actionableStages) {
    const info = state.stageProgress[stage];
    if (info?.completedAt) {
      completed += 1;
    } else if (info) {
      completed += info.progress;
    }
  }

  return completed / total;
};

export const selectElapsedTime = (state: ProcessingStore): number | null => {
  const firstTransition = state.stageHistory[0];
  if (!firstTransition) return null;
  return Date.now() - new Date(firstTransition.timestamp).getTime();
};

// ---------------------------------------------------------------------------
// Re-exports for external consumers
// ---------------------------------------------------------------------------

export { VALID_STAGE_TRANSITIONS, STAGE_TO_STATUS, PIPELINE_STAGES };
