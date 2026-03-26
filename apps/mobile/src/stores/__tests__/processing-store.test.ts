import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  useProcessingStore,
  DEFAULT_PROCESSING_STATE,
  VALID_STAGE_TRANSITIONS,
  STAGE_TO_STATUS,
  PIPELINE_STAGES,
  selectCurrentStage,
  selectDocumentId,
  selectIsPaused,
  selectError,
  selectStageHistory,
  selectIsProcessing,
  selectIsIdle,
  selectIsDone,
  selectCanAdvance,
  selectNextStage,
  selectCurrentProgress,
  selectOverallProgress,
  selectElapsedTime,
} from '../processing-store';

import type { PipelineStage } from '@fillit/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore(): void {
  useProcessingStore.getState().reset();
}

/** Advance the pipeline from scanning through `count` stages via advanceStage. */
function advanceStages(count: number): void {
  for (let i = 0; i < count; i++) {
    useProcessingStore.getState().advanceStage();
  }
}

/** Start processing and advance to a given stage. */
function advanceTo(stage: PipelineStage): void {
  const store = useProcessingStore.getState();
  if (store.currentStage === 'idle') {
    useProcessingStore.getState().startProcessing('doc-test');
  }

  const stageOrder: PipelineStage[] = [
    'scanning',
    'reviewing',
    'ocr',
    'detecting',
    'matching',
    'signing',
    'exporting',
    'done',
  ];
  const currentIdx = stageOrder.indexOf(useProcessingStore.getState().currentStage);
  const targetIdx = stageOrder.indexOf(stage);
  if (targetIdx > currentIdx) {
    advanceStages(targetIdx - currentIdx);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetStore();
});

// ─── Default State ────────────────────────────────────────────────────────

describe('default state', () => {
  it('has correct initial values', () => {
    const state = useProcessingStore.getState();
    expect(state.currentStage).toBe('idle');
    expect(state.documentId).toBeNull();
    expect(state.stageProgress).toEqual({});
    expect(state.isPaused).toBe(false);
    expect(state.error).toBeNull();
    expect(state.stageHistory).toEqual([]);
  });
});

// ─── Lifecycle Actions ────────────────────────────────────────────────────

describe('lifecycle actions', () => {
  describe('startProcessing', () => {
    it('transitions from idle to scanning and initializes state', () => {
      useProcessingStore.getState().startProcessing('doc-1');

      const state = useProcessingStore.getState();
      expect(state.currentStage).toBe('scanning');
      expect(state.documentId).toBe('doc-1');
      expect(state.isPaused).toBe(false);
      expect(state.error).toBeNull();
      expect(state.stageProgress.scanning).toBeDefined();
      expect(state.stageProgress.scanning!.progress).toBe(0);
      expect(state.stageProgress.scanning!.startedAt).toBeDefined();
      expect(state.stageHistory).toHaveLength(1);
      expect(state.stageHistory[0].from).toBe('idle');
      expect(state.stageHistory[0].to).toBe('scanning');
      expect(state.stageHistory[0].timestamp).toBeDefined();
    });

    it('sets error when called from non-idle stage', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().startProcessing('doc-2');

      const state = useProcessingStore.getState();
      expect(state.currentStage).toBe('scanning');
      expect(state.documentId).toBe('doc-1');
      expect(state.error).not.toBeNull();
      expect(state.error!.operation).toBe('start');
      expect(state.error!.stage).toBe('scanning');
      expect(state.error!.message).toContain('Cannot start processing');
      expect(state.error!.message).toContain('scanning');
    });

    it('sets error when called from done stage', () => {
      advanceTo('done');
      useProcessingStore.getState().startProcessing('doc-2');

      const state = useProcessingStore.getState();
      expect(state.error).not.toBeNull();
      expect(state.error!.operation).toBe('start');
      expect(state.error!.stage).toBe('done');
    });
  });

  describe('reset', () => {
    it('returns to DEFAULT_PROCESSING_STATE', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      advanceStages(3);
      useProcessingStore.getState().pause();

      useProcessingStore.getState().reset();

      const state = useProcessingStore.getState();
      expect(state.currentStage).toBe(DEFAULT_PROCESSING_STATE.currentStage);
      expect(state.documentId).toBe(DEFAULT_PROCESSING_STATE.documentId);
      expect(state.stageProgress).toEqual(DEFAULT_PROCESSING_STATE.stageProgress);
      expect(state.isPaused).toBe(DEFAULT_PROCESSING_STATE.isPaused);
      expect(state.error).toBe(DEFAULT_PROCESSING_STATE.error);
      expect(state.stageHistory).toEqual(DEFAULT_PROCESSING_STATE.stageHistory);
    });

    it('clears errors on reset', () => {
      useProcessingStore.getState().handleError('transition', new Error('some error'));
      expect(useProcessingStore.getState().error).not.toBeNull();

      useProcessingStore.getState().reset();
      expect(useProcessingStore.getState().error).toBeNull();
    });
  });
});

// ─── Stage Transitions ────────────────────────────────────────────────────

describe('stage transitions', () => {
  describe('advanceStage', () => {
    it('walks through all stages in order', () => {
      useProcessingStore.getState().startProcessing('doc-1');

      const expectedOrder: PipelineStage[] = [
        'scanning',
        'reviewing',
        'ocr',
        'detecting',
        'matching',
        'signing',
        'exporting',
        'done',
      ];

      expect(useProcessingStore.getState().currentStage).toBe('scanning');

      for (let i = 1; i < expectedOrder.length; i++) {
        useProcessingStore.getState().advanceStage();
        expect(useProcessingStore.getState().currentStage).toBe(expectedOrder[i]);
      }
    });

    it('records history for each transition', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      advanceStages(3); // scanning → reviewing → ocr → detecting

      const history = useProcessingStore.getState().stageHistory;
      // 1 from startProcessing (idle→scanning) + 3 from advanceStage
      expect(history).toHaveLength(4);
      expect(history[0]).toMatchObject({ from: 'idle', to: 'scanning' });
      expect(history[1]).toMatchObject({ from: 'scanning', to: 'reviewing' });
      expect(history[2]).toMatchObject({ from: 'reviewing', to: 'ocr' });
      expect(history[3]).toMatchObject({ from: 'ocr', to: 'detecting' });
    });

    it('sets error when paused', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().pause();
      useProcessingStore.getState().advanceStage();

      const state = useProcessingStore.getState();
      expect(state.currentStage).toBe('scanning');
      expect(state.error).not.toBeNull();
      expect(state.error!.operation).toBe('transition');
      expect(state.error!.message).toContain('paused');
    });

    it('sets error when unresolved error exists', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().handleError('transition', new Error('previous error'));
      useProcessingStore.getState().advanceStage();

      const state = useProcessingStore.getState();
      expect(state.currentStage).toBe('scanning');
      expect(state.error!.message).toContain('unresolved error');
    });

    it('advances from done to idle (done has a valid transition)', () => {
      advanceTo('done');
      expect(useProcessingStore.getState().currentStage).toBe('done');

      useProcessingStore.getState().advanceStage();
      expect(useProcessingStore.getState().currentStage).toBe('idle');
    });

    it('auto-completes previous stage progress when advancing', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().updateProgress(0.5);
      useProcessingStore.getState().advanceStage();

      const scanningProgress = useProcessingStore.getState().stageProgress.scanning;
      expect(scanningProgress).toBeDefined();
      expect(scanningProgress!.progress).toBe(1);
      expect(scanningProgress!.completedAt).toBeDefined();
    });
  });

  describe('transitionTo', () => {
    it('transitions to a valid next stage', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().transitionTo('reviewing');

      expect(useProcessingStore.getState().currentStage).toBe('reviewing');
    });

    it('sets error for invalid transition', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().transitionTo('done');

      const state = useProcessingStore.getState();
      expect(state.currentStage).toBe('scanning');
      expect(state.error).not.toBeNull();
      expect(state.error!.operation).toBe('transition');
      expect(state.error!.message).toContain('Invalid transition');
      expect(state.error!.message).toContain('scanning');
      expect(state.error!.message).toContain('done');
    });

    it('sets error when paused', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().pause();
      useProcessingStore.getState().transitionTo('reviewing');

      expect(useProcessingStore.getState().currentStage).toBe('scanning');
      expect(useProcessingStore.getState().error!.message).toContain('paused');
    });

    it('sets error when unresolved error exists', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().handleError('transition', new Error('prev'));
      useProcessingStore.getState().transitionTo('reviewing');

      expect(useProcessingStore.getState().currentStage).toBe('scanning');
      expect(useProcessingStore.getState().error!.message).toContain('unresolved error');
    });

    it('records history on valid transition', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().transitionTo('reviewing');

      const history = useProcessingStore.getState().stageHistory;
      expect(history).toHaveLength(2);
      expect(history[1]).toMatchObject({ from: 'scanning', to: 'reviewing' });
    });

    it('auto-completes previous stage and initializes next stage progress', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().updateProgress(0.3);
      useProcessingStore.getState().transitionTo('reviewing');

      const progress = useProcessingStore.getState().stageProgress;
      expect(progress.scanning!.progress).toBe(1);
      expect(progress.scanning!.completedAt).toBeDefined();
      expect(progress.reviewing).toBeDefined();
      expect(progress.reviewing!.progress).toBe(0);
      expect(progress.reviewing!.startedAt).toBeDefined();
    });
  });

  describe('full pipeline walkthrough', () => {
    it('starts, advances through all stages, and reaches done', () => {
      useProcessingStore.getState().startProcessing('doc-full');

      const stages: PipelineStage[] = [
        'reviewing',
        'ocr',
        'detecting',
        'matching',
        'signing',
        'exporting',
        'done',
      ];

      for (const stage of stages) {
        useProcessingStore.getState().advanceStage();
        expect(useProcessingStore.getState().currentStage).toBe(stage);
        expect(useProcessingStore.getState().error).toBeNull();
      }

      expect(useProcessingStore.getState().documentId).toBe('doc-full');
      // 1 from start + 7 advances
      expect(useProcessingStore.getState().stageHistory).toHaveLength(8);
    });
  });
});

// ─── Progress Tracking ────────────────────────────────────────────────────

describe('progress tracking', () => {
  describe('updateProgress', () => {
    it('sets progress on current stage', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().updateProgress(0.5);

      const progress = useProcessingStore.getState().stageProgress.scanning;
      expect(progress).toBeDefined();
      expect(progress!.progress).toBe(0.5);
    });

    it('clamps negative values to 0', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().updateProgress(-1);

      expect(useProcessingStore.getState().stageProgress.scanning!.progress).toBe(0);
    });

    it('clamps values above 1 to 1', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().updateProgress(2);

      expect(useProcessingStore.getState().stageProgress.scanning!.progress).toBe(1);
    });

    it('does nothing when no stage progress exists for current stage', () => {
      // In idle there is no stageProgress entry
      useProcessingStore.getState().updateProgress(0.5);
      expect(useProcessingStore.getState().stageProgress).toEqual({});
    });
  });

  describe('completeCurrentStage', () => {
    it('sets progress to 1 and completedAt', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().updateProgress(0.5);
      useProcessingStore.getState().completeCurrentStage();

      const progress = useProcessingStore.getState().stageProgress.scanning;
      expect(progress!.progress).toBe(1);
      expect(progress!.completedAt).toBeDefined();
    });

    it('does not overwrite existing completedAt', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().completeCurrentStage();

      const firstCompletedAt = useProcessingStore.getState().stageProgress.scanning!.completedAt;
      expect(firstCompletedAt).toBeDefined();

      // Call again — completedAt should not change
      useProcessingStore.getState().completeCurrentStage();

      const secondCompletedAt = useProcessingStore.getState().stageProgress.scanning!.completedAt;
      expect(secondCompletedAt).toBe(firstCompletedAt);
    });

    it('does nothing when no stage progress exists for current stage', () => {
      useProcessingStore.getState().completeCurrentStage();
      expect(useProcessingStore.getState().stageProgress).toEqual({});
    });
  });

  describe('stage progress persistence across transitions', () => {
    it('previous stages keep their progress after advancing', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().updateProgress(0.7);
      useProcessingStore.getState().advanceStage(); // scanning → reviewing
      useProcessingStore.getState().updateProgress(0.4);
      useProcessingStore.getState().advanceStage(); // reviewing → ocr

      const progress = useProcessingStore.getState().stageProgress;
      // scanning should be auto-completed (progress = 1)
      expect(progress.scanning!.progress).toBe(1);
      expect(progress.scanning!.completedAt).toBeDefined();
      // reviewing should be auto-completed (progress = 1)
      expect(progress.reviewing!.progress).toBe(1);
      expect(progress.reviewing!.completedAt).toBeDefined();
      // ocr should be freshly initialized
      expect(progress.ocr!.progress).toBe(0);
      expect(progress.ocr!.completedAt).toBeUndefined();
    });
  });
});

// ─── Pause / Resume ──────────────────────────────────────────────────────

describe('pause / resume', () => {
  describe('pause', () => {
    it('sets isPaused to true during active processing', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().pause();

      expect(useProcessingStore.getState().isPaused).toBe(true);
    });

    it('sets error when called from idle', () => {
      useProcessingStore.getState().pause();

      const error = useProcessingStore.getState().error;
      expect(error).not.toBeNull();
      expect(error!.operation).toBe('pause');
      expect(error!.stage).toBe('idle');
      expect(error!.message).toContain('idle');
    });

    it('sets error when called from done', () => {
      advanceTo('done');
      useProcessingStore.getState().pause();

      const error = useProcessingStore.getState().error;
      expect(error).not.toBeNull();
      expect(error!.operation).toBe('pause');
      expect(error!.stage).toBe('done');
      expect(error!.message).toContain('done');
    });

    it('sets error when already paused', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().pause();
      useProcessingStore.getState().pause();

      const error = useProcessingStore.getState().error;
      expect(error).not.toBeNull();
      expect(error!.operation).toBe('pause');
      expect(error!.message).toContain('Already paused');
    });
  });

  describe('resume', () => {
    it('clears isPaused', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().pause();
      expect(useProcessingStore.getState().isPaused).toBe(true);

      useProcessingStore.getState().resume();
      expect(useProcessingStore.getState().isPaused).toBe(false);
    });

    it('sets error when not paused', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().resume();

      const error = useProcessingStore.getState().error;
      expect(error).not.toBeNull();
      expect(error!.operation).toBe('resume');
      expect(error!.message).toContain('not paused');
    });
  });
});

// ─── Error Handling ──────────────────────────────────────────────────────

describe('error handling', () => {
  describe('handleError', () => {
    it('sets error with current stage context', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().handleError('transition', new Error('OCR failed'));

      const error = useProcessingStore.getState().error;
      expect(error).not.toBeNull();
      expect(error!.operation).toBe('transition');
      expect(error!.message).toBe('OCR failed');
      expect(error!.stage).toBe('scanning');
      expect(error!.cause).toBeInstanceOf(Error);
    });

    it('extracts message from Error instance', () => {
      useProcessingStore.getState().handleError('start', new Error('Network timeout'));

      expect(useProcessingStore.getState().error!.message).toBe('Network timeout');
    });

    it('converts string to message', () => {
      useProcessingStore.getState().handleError('start', 'Something went wrong');

      expect(useProcessingStore.getState().error!.message).toBe('Something went wrong');
    });

    it('converts other types to string message', () => {
      useProcessingStore.getState().handleError('start', 42);

      expect(useProcessingStore.getState().error!.message).toBe('42');
    });
  });

  describe('retry', () => {
    it('clears error and resets current stage progress', () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
        useProcessingStore.getState().startProcessing('doc-1');
        useProcessingStore.getState().updateProgress(0.7);
        useProcessingStore.getState().handleError('transition', new Error('fail'));

        const beforeRetry = useProcessingStore.getState().stageProgress.scanning!;
        const originalStartedAt = beforeRetry.startedAt;

        vi.setSystemTime(new Date('2026-01-01T00:01:00Z'));
        useProcessingStore.getState().retry();

        const state = useProcessingStore.getState();
        expect(state.error).toBeNull();
        expect(state.stageProgress.scanning!.progress).toBe(0);
        // startedAt should be reset (new timestamp)
        expect(state.stageProgress.scanning!.startedAt).not.toBe(originalStartedAt);
      } finally {
        vi.useRealTimers();
      }
    });

    it('preserves the current stage', () => {
      advanceTo('ocr');
      useProcessingStore.getState().handleError('transition', new Error('fail'));
      useProcessingStore.getState().retry();

      expect(useProcessingStore.getState().currentStage).toBe('ocr');
    });
  });

  describe('clearError', () => {
    it('clears error without resetting progress', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().updateProgress(0.7);
      useProcessingStore.getState().handleError('transition', new Error('fail'));
      useProcessingStore.getState().clearError();

      const state = useProcessingStore.getState();
      expect(state.error).toBeNull();
      expect(state.stageProgress.scanning!.progress).toBe(0.7);
    });
  });
});

// ─── Selectors — Basic State ─────────────────────────────────────────────

describe('selectors — basic state', () => {
  it('selectCurrentStage returns current stage', () => {
    expect(selectCurrentStage(useProcessingStore.getState())).toBe('idle');

    useProcessingStore.getState().startProcessing('doc-1');
    expect(selectCurrentStage(useProcessingStore.getState())).toBe('scanning');
  });

  it('selectDocumentId returns document ID', () => {
    expect(selectDocumentId(useProcessingStore.getState())).toBeNull();

    useProcessingStore.getState().startProcessing('doc-1');
    expect(selectDocumentId(useProcessingStore.getState())).toBe('doc-1');
  });

  it('selectIsPaused returns pause state', () => {
    expect(selectIsPaused(useProcessingStore.getState())).toBe(false);

    useProcessingStore.getState().startProcessing('doc-1');
    useProcessingStore.getState().pause();
    expect(selectIsPaused(useProcessingStore.getState())).toBe(true);
  });

  it('selectError returns error or null', () => {
    expect(selectError(useProcessingStore.getState())).toBeNull();

    useProcessingStore.getState().handleError('start', new Error('fail'));
    expect(selectError(useProcessingStore.getState())).not.toBeNull();
    expect(selectError(useProcessingStore.getState())!.message).toBe('fail');
  });

  it('selectStageHistory returns transition history', () => {
    expect(selectStageHistory(useProcessingStore.getState())).toEqual([]);

    useProcessingStore.getState().startProcessing('doc-1');
    const history = selectStageHistory(useProcessingStore.getState());
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ from: 'idle', to: 'scanning' });
  });
});

// ─── Selectors — Derived State ───────────────────────────────────────────

describe('selectors — derived state', () => {
  describe('selectIsProcessing', () => {
    it('returns false when idle', () => {
      expect(selectIsProcessing(useProcessingStore.getState())).toBe(false);
    });

    it('returns true when actively processing', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      expect(selectIsProcessing(useProcessingStore.getState())).toBe(true);
    });

    it('returns false when done', () => {
      advanceTo('done');
      expect(selectIsProcessing(useProcessingStore.getState())).toBe(false);
    });

    it('returns false when paused', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().pause();
      expect(selectIsProcessing(useProcessingStore.getState())).toBe(false);
    });

    it('returns true for each active intermediate stage', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      const activeStages: PipelineStage[] = [
        'scanning',
        'reviewing',
        'ocr',
        'detecting',
        'matching',
        'signing',
        'exporting',
      ];

      for (let i = 0; i < activeStages.length; i++) {
        expect(selectIsProcessing(useProcessingStore.getState())).toBe(true);
        if (i < activeStages.length - 1) {
          useProcessingStore.getState().advanceStage();
        }
      }
    });
  });

  describe('selectIsIdle', () => {
    it('returns true when idle', () => {
      expect(selectIsIdle(useProcessingStore.getState())).toBe(true);
    });

    it('returns false when processing', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      expect(selectIsIdle(useProcessingStore.getState())).toBe(false);
    });

    it('returns false when done', () => {
      advanceTo('done');
      expect(selectIsIdle(useProcessingStore.getState())).toBe(false);
    });
  });

  describe('selectIsDone', () => {
    it('returns true when done', () => {
      advanceTo('done');
      expect(selectIsDone(useProcessingStore.getState())).toBe(true);
    });

    it('returns false when idle', () => {
      expect(selectIsDone(useProcessingStore.getState())).toBe(false);
    });

    it('returns false when processing', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      expect(selectIsDone(useProcessingStore.getState())).toBe(false);
    });
  });

  describe('selectCanAdvance', () => {
    it('returns true when has valid next stage, not paused, no error', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      expect(selectCanAdvance(useProcessingStore.getState())).toBe(true);
    });

    it('returns true from idle (idle can transition to scanning)', () => {
      expect(selectCanAdvance(useProcessingStore.getState())).toBe(true);
    });

    it('returns true from done (done can transition to idle)', () => {
      advanceTo('done');
      expect(selectCanAdvance(useProcessingStore.getState())).toBe(true);
    });

    it('returns false when paused', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().pause();
      expect(selectCanAdvance(useProcessingStore.getState())).toBe(false);
    });

    it('returns false when error exists', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().handleError('transition', new Error('fail'));
      expect(selectCanAdvance(useProcessingStore.getState())).toBe(false);
    });
  });

  describe('selectNextStage', () => {
    it('returns scanning when idle', () => {
      expect(selectNextStage(useProcessingStore.getState())).toBe('scanning');
    });

    it('returns reviewing when scanning', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      expect(selectNextStage(useProcessingStore.getState())).toBe('reviewing');
    });

    it('returns idle when done', () => {
      advanceTo('done');
      expect(selectNextStage(useProcessingStore.getState())).toBe('idle');
    });

    it('returns correct next stage for every pipeline stage', () => {
      const expectedNext: Record<PipelineStage, PipelineStage> = {
        idle: 'scanning',
        scanning: 'reviewing',
        reviewing: 'ocr',
        ocr: 'detecting',
        detecting: 'matching',
        matching: 'signing',
        signing: 'exporting',
        exporting: 'done',
        done: 'idle',
      };

      // Test idle
      expect(selectNextStage(useProcessingStore.getState())).toBe(expectedNext.idle);

      // Test scanning through done
      useProcessingStore.getState().startProcessing('doc-1');
      const stages: PipelineStage[] = [
        'scanning',
        'reviewing',
        'ocr',
        'detecting',
        'matching',
        'signing',
        'exporting',
        'done',
      ];

      for (const stage of stages) {
        expect(useProcessingStore.getState().currentStage).toBe(stage);
        expect(selectNextStage(useProcessingStore.getState())).toBe(expectedNext[stage]);
        if (stage !== 'done') {
          useProcessingStore.getState().advanceStage();
        }
      }
    });
  });

  describe('selectCurrentProgress', () => {
    it('returns null when idle (no stage progress)', () => {
      expect(selectCurrentProgress(useProcessingStore.getState())).toBeNull();
    });

    it('returns progress for current stage', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().updateProgress(0.6);

      const progress = selectCurrentProgress(useProcessingStore.getState());
      expect(progress).not.toBeNull();
      expect(progress!.progress).toBe(0.6);
      expect(progress!.startedAt).toBeDefined();
    });
  });

  describe('selectOverallProgress', () => {
    it('returns 0 when idle', () => {
      expect(selectOverallProgress(useProcessingStore.getState())).toBe(0);
    });

    it('returns fractional progress during processing', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      useProcessingStore.getState().updateProgress(0.5);

      const progress = selectOverallProgress(useProcessingStore.getState());
      // There are 8 actionable stages. scanning has 0.5 progress, so 0.5/8 = 0.0625
      expect(progress).toBeCloseTo(0.5 / 8, 5);
    });

    it('returns approximately 1 when done with all stages complete', () => {
      advanceTo('done');

      const progress = selectOverallProgress(useProcessingStore.getState());
      // All stages scanning through done should be completed
      // done stage itself gets initialized by advanceStage, and the progress for exporting
      // is set to 1. The done stage has progress 0 and no completedAt, so it contributes 0.
      // But the done stage has completedAt = undefined, so it contributes its progress (0).
      // Actually let's verify: when we advance to done, exporting→done transition sets
      // exporting to completed (progress=1, completedAt set) and done gets initStageProgress
      // (progress=0, no completedAt). So 7 stages completed + done at progress 0 = 7/8.
      // To get close to 1 we need to complete the done stage too.
      useProcessingStore.getState().completeCurrentStage();
      const finalProgress = selectOverallProgress(useProcessingStore.getState());
      expect(finalProgress).toBe(1);
    });

    it('accounts for partially completed stages', () => {
      useProcessingStore.getState().startProcessing('doc-1');
      // Complete scanning, advance to reviewing
      useProcessingStore.getState().advanceStage();
      // Set reviewing to 0.5
      useProcessingStore.getState().updateProgress(0.5);

      const progress = selectOverallProgress(useProcessingStore.getState());
      // scanning completed (1), reviewing partial (0.5) = 1.5 / 8
      expect(progress).toBeCloseTo(1.5 / 8, 5);
    });
  });

  describe('selectElapsedTime', () => {
    it('returns null when idle (no history)', () => {
      expect(selectElapsedTime(useProcessingStore.getState())).toBeNull();
    });

    it('returns positive number after starting', () => {
      useProcessingStore.getState().startProcessing('doc-1');

      const elapsed = selectElapsedTime(useProcessingStore.getState());
      expect(elapsed).not.toBeNull();
      expect(elapsed!).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── Constants ────────────────────────────────────────────────────────────

describe('constants', () => {
  describe('VALID_STAGE_TRANSITIONS', () => {
    it('has entries for all 9 pipeline stages', () => {
      const allStages: PipelineStage[] = [
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

      for (const stage of allStages) {
        expect(VALID_STAGE_TRANSITIONS[stage]).toBeDefined();
        expect(Array.isArray(VALID_STAGE_TRANSITIONS[stage])).toBe(true);
      }

      expect(Object.keys(VALID_STAGE_TRANSITIONS)).toHaveLength(9);
    });

    it('defines correct transitions for each stage', () => {
      expect(VALID_STAGE_TRANSITIONS.idle).toEqual(['scanning']);
      expect(VALID_STAGE_TRANSITIONS.scanning).toEqual(['reviewing']);
      expect(VALID_STAGE_TRANSITIONS.reviewing).toEqual(['ocr']);
      expect(VALID_STAGE_TRANSITIONS.ocr).toEqual(['detecting']);
      expect(VALID_STAGE_TRANSITIONS.detecting).toEqual(['matching']);
      expect(VALID_STAGE_TRANSITIONS.matching).toEqual(['signing']);
      expect(VALID_STAGE_TRANSITIONS.signing).toEqual(['exporting']);
      expect(VALID_STAGE_TRANSITIONS.exporting).toEqual(['done']);
      expect(VALID_STAGE_TRANSITIONS.done).toEqual(['idle']);
    });
  });

  describe('STAGE_TO_STATUS', () => {
    it('maps stages to correct processing statuses', () => {
      expect(STAGE_TO_STATUS.scanning).toBe('scanned');
      expect(STAGE_TO_STATUS.ocr).toBe('ocr_complete');
      expect(STAGE_TO_STATUS.detecting).toBe('fields_detected');
      expect(STAGE_TO_STATUS.matching).toBe('matched');
      expect(STAGE_TO_STATUS.signing).toBe('reviewed');
      expect(STAGE_TO_STATUS.done).toBe('exported');
    });

    it('does not map idle, reviewing, or exporting stages', () => {
      expect(STAGE_TO_STATUS.idle).toBeUndefined();
      expect(STAGE_TO_STATUS.reviewing).toBeUndefined();
      expect(STAGE_TO_STATUS.exporting).toBeUndefined();
    });
  });

  describe('PIPELINE_STAGES', () => {
    it('contains all 9 stages in correct order', () => {
      expect(PIPELINE_STAGES).toEqual([
        'idle',
        'scanning',
        'reviewing',
        'ocr',
        'detecting',
        'matching',
        'signing',
        'exporting',
        'done',
      ]);
    });

    it('has 9 elements', () => {
      expect(PIPELINE_STAGES).toHaveLength(9);
    });
  });
});
