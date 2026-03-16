import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';
import { parse } from 'yaml';

// ── Types ────────────────────────────────────────────────────────────

interface WorkflowStep {
  uses?: string;
  run?: string;
  name?: string;
  id?: string;
  with?: Record<string, string>;
  env?: Record<string, string>;
}

interface WorkflowJob {
  name: string;
  'runs-on': string;
  needs?: string | string[];
  if?: string;
  steps: WorkflowStep[];
}

interface Workflow {
  name: string;
  on: Record<string, unknown>;
  concurrency?: Record<string, unknown>;
  env?: Record<string, string>;
  permissions?: Record<string, string>;
  jobs: Record<string, WorkflowJob>;
}

// ── Helpers ──────────────────────────────────────────────────────────

const repoRoot = resolve(__dirname, '../../');
const readFile = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), 'utf-8');

// ── Dockerfile ───────────────────────────────────────────────────────

describe('Dockerfile', () => {
  let content: string;

  beforeAll(() => {
    content = readFile('apps/server/Dockerfile');
  });

  it('should exist at apps/server/Dockerfile', () => {
    expect(existsSync(resolve(repoRoot, 'apps/server/Dockerfile'))).toBe(true);
  });

  describe('Multi-stage build', () => {
    it('should have a base stage', () => {
      expect(content).toMatch(/FROM\s+\S+\s+AS\s+base/i);
    });

    it('should have a deps stage', () => {
      expect(content).toMatch(/FROM\s+\S+\s+AS\s+deps/i);
    });

    it('should have a build stage', () => {
      expect(content).toMatch(/FROM\s+\S+\s+AS\s+build/i);
    });

    it('should have a production stage', () => {
      expect(content).toMatch(/FROM\s+\S+\s+AS\s+production/i);
    });
  });

  it('should use node:20-alpine as the base image', () => {
    expect(content).toMatch(/FROM\s+node:20-alpine\s+AS\s+base/);
  });

  it('should install pnpm 10.30.3', () => {
    expect(content).toContain('pnpm@10.30.3');
  });

  describe('Workspace files', () => {
    it('should copy package.json', () => {
      expect(content).toMatch(/COPY\s+package\.json/);
    });

    it('should copy pnpm-lock.yaml', () => {
      expect(content).toContain('pnpm-lock.yaml');
    });

    it('should copy pnpm-workspace.yaml', () => {
      expect(content).toContain('pnpm-workspace.yaml');
    });
  });

  it('should build shared package before server package', () => {
    const sharedBuildIdx = content.indexOf('pnpm --filter @fillit/shared build');
    const serverBuildIdx = content.indexOf('pnpm --filter @fillit/server build');
    expect(sharedBuildIdx).toBeGreaterThan(-1);
    expect(serverBuildIdx).toBeGreaterThan(-1);
    expect(sharedBuildIdx).toBeLessThan(serverBuildIdx);
  });

  it('should set PORT=8080 in production stage', () => {
    expect(content).toMatch(/ENV\s+PORT=8080/);
  });

  it('should expose port 8080', () => {
    expect(content).toMatch(/EXPOSE\s+8080/);
  });

  it('should run node dist/index.js as final CMD', () => {
    expect(content).toContain('CMD ["node", "dist/index.js"]');
  });

  it('should use node:20-alpine for the production stage', () => {
    expect(content).toMatch(/FROM\s+node:20-alpine\s+AS\s+production/);
  });

  it('should patch shared package.json exports for dist output', () => {
    // The Dockerfile patches the shared package.json to point exports to dist/
    expect(content).toContain('dist/index.js');
    expect(content).toContain('dist/index.d.ts');
    expect(content).toMatch(/pkg\.exports/);
  });
});

// ── fly.toml ─────────────────────────────────────────────────────────

describe('fly.toml', () => {
  let content: string;

  beforeAll(() => {
    content = readFile('apps/server/fly.toml');
  });

  it('should exist at apps/server/fly.toml', () => {
    expect(existsSync(resolve(repoRoot, 'apps/server/fly.toml'))).toBe(true);
  });

  it('should set app name to fillit-server', () => {
    expect(content).toMatch(/^app\s*=\s*'fillit-server'/m);
  });

  it('should set primary region to jnb (Johannesburg)', () => {
    expect(content).toMatch(/^primary_region\s*=\s*'jnb'/m);
  });

  it('should set internal port to 8080', () => {
    expect(content).toMatch(/internal_port\s*=\s*8080/);
  });

  describe('Health check', () => {
    it('should have a health check on /health path', () => {
      expect(content).toMatch(/path\s*=\s*'\/health'/);
    });

    it('should use GET method for health check', () => {
      expect(content).toMatch(/method\s*=\s*'GET'/);
    });
  });

  it('should configure auto_stop_machines', () => {
    expect(content).toMatch(/auto_stop_machines\s*=/);
  });

  it('should enable auto_start_machines', () => {
    expect(content).toMatch(/auto_start_machines\s*=\s*true/);
  });

  it('should set min_machines_running to 0', () => {
    expect(content).toMatch(/min_machines_running\s*=\s*0/);
  });

  it('should configure 256mb memory', () => {
    expect(content).toMatch(/memory\s*=\s*'256mb'/);
  });
});

// ── deploy-server.yml workflow ───────────────────────────────────────

describe('Deploy server workflow', () => {
  let workflow: Workflow;
  let rawContent: string;

  beforeAll(() => {
    rawContent = readFile('.github/workflows/deploy-server.yml');
    workflow = parse(rawContent) as Workflow;
  });

  it('should exist at .github/workflows/deploy-server.yml', () => {
    expect(existsSync(resolve(repoRoot, '.github/workflows/deploy-server.yml'))).toBe(true);
  });

  describe('Triggers', () => {
    it('should trigger on push to main', () => {
      const push = workflow.on['push'] as { branches: string[]; paths: string[] };
      expect(push.branches).toContain('main');
    });

    it('should filter on apps/server/** path', () => {
      const push = workflow.on['push'] as { paths: string[] };
      expect(push.paths).toContain('apps/server/**');
    });

    it('should filter on packages/shared/** path', () => {
      const push = workflow.on['push'] as { paths: string[] };
      expect(push.paths).toContain('packages/shared/**');
    });

    it('should filter on the workflow file itself', () => {
      const push = workflow.on['push'] as { paths: string[] };
      expect(push.paths).toContain('.github/workflows/deploy-server.yml');
    });

    it('should have workflow_dispatch trigger', () => {
      expect(workflow.on).toHaveProperty('workflow_dispatch');
    });
  });

  describe('Concurrency', () => {
    it('should have a concurrency group', () => {
      expect(workflow.concurrency).toBeDefined();
      expect(workflow.concurrency?.['group']).toBeDefined();
    });

    it('should not cancel in-progress deployments', () => {
      expect(workflow.concurrency?.['cancel-in-progress']).toBe(false);
    });
  });

  describe('Jobs', () => {
    it('should have test, deploy, smoke-test, and rollback jobs', () => {
      expect(workflow.jobs['test']).toBeDefined();
      expect(workflow.jobs['deploy']).toBeDefined();
      expect(workflow.jobs['smoke-test']).toBeDefined();
      expect(workflow.jobs['rollback']).toBeDefined();
    });

    describe('test job', () => {
      it('should run lint, typecheck, and tests', () => {
        const job = workflow.jobs['test']!;
        const stepRuns = job.steps.map((s) => s.run ?? s.name ?? '').join('\n');
        expect(stepRuns).toContain('lint');
        expect(stepRuns).toContain('typecheck');
        expect(stepRuns).toContain('test');
      });
    });

    describe('deploy job', () => {
      it('should depend on test job', () => {
        const job = workflow.jobs['deploy']!;
        const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
        expect(needs).toContain('test');
      });

      it('should use FLY_API_TOKEN secret', () => {
        const job = workflow.jobs['deploy']!;
        const hasToken = job.steps.some(
          (s) => s.env?.['FLY_API_TOKEN'] === '${{ secrets.FLY_API_TOKEN }}',
        );
        expect(hasToken).toBe(true);
      });
    });

    describe('smoke-test job', () => {
      it('should depend on deploy job', () => {
        const job = workflow.jobs['smoke-test']!;
        const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
        expect(needs).toContain('deploy');
      });

      it('should hit the health endpoint', () => {
        const job = workflow.jobs['smoke-test']!;
        const stepRuns = job.steps.map((s) => s.run ?? '').join('\n');
        expect(stepRuns).toContain('https://fillit-server.fly.dev/health');
      });
    });

    describe('rollback job', () => {
      it('should depend on smoke-test job', () => {
        const job = workflow.jobs['rollback']!;
        const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
        expect(needs).toContain('smoke-test');
      });

      it('should only run on failure', () => {
        const job = workflow.jobs['rollback']!;
        expect(job.if).toContain('failure()');
      });

      it('should get previous release image', () => {
        const job = workflow.jobs['rollback']!;
        const stepRuns = job.steps.map((s) => s.run ?? '').join('\n');
        expect(stepRuns).toContain('previous_image');
        expect(stepRuns).toContain('flyctl releases');
      });

      it('should redeploy the previous image', () => {
        const job = workflow.jobs['rollback']!;
        const stepRuns = job.steps.map((s) => s.run ?? '').join('\n');
        expect(stepRuns).toContain('flyctl deploy');
        expect(stepRuns).toContain('--image');
      });
    });
  });
});

// ── .dockerignore ────────────────────────────────────────────────────

describe('.dockerignore', () => {
  let content: string;

  beforeAll(() => {
    content = readFile('.dockerignore');
  });

  it('should exist at repo root', () => {
    expect(existsSync(resolve(repoRoot, '.dockerignore'))).toBe(true);
  });

  it('should exclude node_modules', () => {
    expect(content).toMatch(/^node_modules$/m);
  });

  it('should exclude .git', () => {
    expect(content).toMatch(/^\.git$/m);
  });

  it('should exclude apps/mobile', () => {
    expect(content).toMatch(/^apps\/mobile$/m);
  });

  it('should exclude .env files', () => {
    expect(content).toMatch(/^\.env/m);
  });
});
