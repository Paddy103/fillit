import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';
import { parse } from 'yaml';

interface WorkflowStep {
  uses?: string;
  run?: string;
  name?: string;
  with?: Record<string, string>;
}

interface WorkflowJob {
  name: string;
  'runs-on': string;
  needs?: string[];
  if?: string;
  steps: WorkflowStep[];
}

interface Workflow {
  name: string;
  on: Record<string, unknown>;
  concurrency?: Record<string, unknown>;
  env?: Record<string, string>;
  jobs: Record<string, WorkflowJob>;
}

describe('CI workflow configuration', () => {
  let workflow: Workflow;

  beforeAll(() => {
    const ciPath = resolve(__dirname, '../.github/workflows/ci.yml');
    const content = readFileSync(ciPath, 'utf-8');
    workflow = parse(content) as Workflow;
  });

  it('should be valid YAML with a name', () => {
    expect(workflow.name).toBe('CI');
  });

  describe('Triggers', () => {
    it('should trigger on pull_request to main', () => {
      const pr = workflow.on['pull_request'] as { branches: string[] };
      expect(pr.branches).toContain('main');
    });

    it('should trigger on push to main', () => {
      const push = workflow.on['push'] as { branches: string[] };
      expect(push.branches).toContain('main');
    });
  });

  describe('Concurrency', () => {
    it('should have concurrency control', () => {
      expect(workflow.concurrency).toBeDefined();
    });

    it('should cancel in-progress runs', () => {
      expect(workflow.concurrency?.['cancel-in-progress']).toBe(true);
    });
  });

  describe('Jobs', () => {
    it('should have lint, typecheck, test, and ci-passed jobs', () => {
      expect(workflow.jobs['lint']).toBeDefined();
      expect(workflow.jobs['typecheck']).toBeDefined();
      expect(workflow.jobs['test']).toBeDefined();
      expect(workflow.jobs['ci-passed']).toBeDefined();
    });

    describe.each(['lint', 'typecheck', 'test'])('%s job', (jobName) => {
      it('should use actions/checkout@v4', () => {
        const job = workflow.jobs[jobName]!;
        const hasCheckout = job.steps.some((s) => s.uses === 'actions/checkout@v4');
        expect(hasCheckout).toBe(true);
      });

      it('should use pnpm/action-setup@v4', () => {
        const job = workflow.jobs[jobName]!;
        const hasPnpm = job.steps.some((s) => s.uses === 'pnpm/action-setup@v4');
        expect(hasPnpm).toBe(true);
      });

      it('should use actions/setup-node@v4', () => {
        const job = workflow.jobs[jobName]!;
        const hasNode = job.steps.some((s) => s.uses === 'actions/setup-node@v4');
        expect(hasNode).toBe(true);
      });

      it('should run pnpm install --frozen-lockfile', () => {
        const job = workflow.jobs[jobName]!;
        const hasInstall = job.steps.some((s) => s.run === 'pnpm install --frozen-lockfile');
        expect(hasInstall).toBe(true);
      });
    });

    it('lint job should run lint with --if-present', () => {
      const lintJob = workflow.jobs['lint']!;
      const hasLint = lintJob.steps.some(
        (s) => s.run?.includes('lint') && s.run.includes('--if-present'),
      );
      expect(hasLint).toBe(true);
    });

    it('lint job should run format:check', () => {
      const lintJob = workflow.jobs['lint']!;
      const hasFormat = lintJob.steps.some((s) => s.run?.includes('format:check'));
      expect(hasFormat).toBe(true);
    });

    it('typecheck job should run typecheck with --if-present', () => {
      const job = workflow.jobs['typecheck']!;
      const has = job.steps.some(
        (s) => s.run?.includes('typecheck') && s.run.includes('--if-present'),
      );
      expect(has).toBe(true);
    });

    it('test job should run test with --if-present', () => {
      const job = workflow.jobs['test']!;
      const has = job.steps.some((s) => s.run?.includes('test') && s.run.includes('--if-present'));
      expect(has).toBe(true);
    });

    it('ci-passed job should depend on lint, typecheck, and test', () => {
      const ciPassed = workflow.jobs['ci-passed']!;
      expect(ciPassed.needs).toContain('lint');
      expect(ciPassed.needs).toContain('typecheck');
      expect(ciPassed.needs).toContain('test');
    });

    it('ci-passed job should run always()', () => {
      const ciPassed = workflow.jobs['ci-passed']!;
      expect(ciPassed.if).toContain('always()');
    });
  });

  describe('Node version', () => {
    it('should use Node 20', () => {
      expect(workflow.env?.['NODE_VERSION']).toBe('20');
    });
  });
});
