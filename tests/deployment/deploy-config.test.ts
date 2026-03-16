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

interface RenderService {
  type: string;
  name: string;
  runtime: string;
  dockerfilePath: string;
  dockerContext: string;
  region: string;
  plan: string;
  autoDeploy: boolean;
  healthCheckPath: string;
  envVars?: Array<{ key: string; value: string }>;
}

interface RenderBlueprint {
  services: RenderService[];
}

// ── Helpers ──────────────────────────────────────────────────────────

const repoRoot = resolve(__dirname, '../../');
const readFile = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf-8');

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

  it('should run node dist/index.js as final CMD', () => {
    expect(content).toContain('CMD ["node", "dist/index.js"]');
  });

  it('should use node:20-alpine for the production stage', () => {
    expect(content).toMatch(/FROM\s+node:20-alpine\s+AS\s+production/);
  });

  it('should set NODE_ENV to production', () => {
    expect(content).toMatch(/ENV\s+NODE_ENV=production/);
  });

  it('should run as a non-root user', () => {
    expect(content).toMatch(/USER\s+\w+/);
    expect(content).toMatch(/adduser/);
  });

  it('should patch shared package.json exports for dist output', () => {
    expect(content).toContain('dist/index.js');
    expect(content).toContain('dist/index.d.ts');
    expect(content).toMatch(/pkg\.exports/);
  });
});

// ── render.yaml ─────────────────────────────────────────────────────

describe('render.yaml', () => {
  let blueprint: RenderBlueprint;

  beforeAll(() => {
    const content = readFile('render.yaml');
    blueprint = parse(content) as RenderBlueprint;
  });

  it('should exist at repo root', () => {
    expect(existsSync(resolve(repoRoot, 'render.yaml'))).toBe(true);
  });

  it('should define a web service', () => {
    expect(blueprint.services).toHaveLength(1);
    expect(blueprint.services[0]!.type).toBe('web');
  });

  it('should name the service fillit-server', () => {
    expect(blueprint.services[0]!.name).toBe('fillit-server');
  });

  it('should use docker runtime', () => {
    expect(blueprint.services[0]!.runtime).toBe('docker');
  });

  it('should point to the correct Dockerfile', () => {
    expect(blueprint.services[0]!.dockerfilePath).toBe('./apps/server/Dockerfile');
  });

  it('should use repo root as docker context', () => {
    expect(blueprint.services[0]!.dockerContext).toBe('.');
  });

  it('should deploy to frankfurt region (closest to SA)', () => {
    expect(blueprint.services[0]!.region).toBe('frankfurt');
  });

  it('should use the free plan', () => {
    expect(blueprint.services[0]!.plan).toBe('free');
  });

  it('should disable auto-deploy (deploys via GitHub Actions)', () => {
    expect(blueprint.services[0]!.autoDeploy).toBe(false);
  });

  it('should configure health check on /health', () => {
    expect(blueprint.services[0]!.healthCheckPath).toBe('/health');
  });

  it('should set NODE_ENV to production', () => {
    const envVars = blueprint.services[0]!.envVars ?? [];
    const nodeEnv = envVars.find((v) => v.key === 'NODE_ENV');
    expect(nodeEnv).toBeDefined();
    expect(nodeEnv!.value).toBe('production');
  });
});

// ── deploy-server.yml workflow ───────────────────────────────────────

describe('Deploy server workflow', () => {
  let workflow: Workflow;

  beforeAll(() => {
    const rawContent = readFile('.github/workflows/deploy-server.yml');
    workflow = parse(rawContent) as Workflow;
  });

  it('should exist at .github/workflows/deploy-server.yml', () => {
    expect(existsSync(resolve(repoRoot, '.github/workflows/deploy-server.yml'))).toBe(
      true,
    );
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

      it('should trigger Render deploy via deploy hook', () => {
        const job = workflow.jobs['deploy']!;
        const stepRuns = job.steps.map((s) => s.run ?? '').join('\n');
        expect(stepRuns).toContain('RENDER_DEPLOY_HOOK_URL');
      });

      it('should poll Render API for deploy completion', () => {
        const job = workflow.jobs['deploy']!;
        const stepRuns = job.steps.map((s) => s.run ?? '').join('\n');
        expect(stepRuns).toContain('api.render.com');
        expect(stepRuns).toContain('deploy.status');
      });

      it('should pass secrets via env vars, not inline', () => {
        const job = workflow.jobs['deploy']!;
        const hasEnvSecrets = job.steps.some(
          (s) => s.env?.['RENDER_DEPLOY_HOOK_URL'] || s.env?.['RENDER_API_KEY'],
        );
        expect(hasEnvSecrets).toBe(true);
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
        expect(stepRuns).toContain('RENDER_SERVICE_URL');
        expect(stepRuns).toContain('/health');
      });

      it('should use jq for JSON validation', () => {
        const job = workflow.jobs['smoke-test']!;
        const stepRuns = job.steps.map((s) => s.run ?? '').join('\n');
        expect(stepRuns).toContain('jq');
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

      it('should use Render API for rollback', () => {
        const job = workflow.jobs['rollback']!;
        const stepRuns = job.steps.map((s) => s.run ?? '').join('\n');
        expect(stepRuns).toContain('api.render.com');
      });

      it('should pass secrets via env vars, not inline', () => {
        const job = workflow.jobs['rollback']!;
        const hasEnvSecrets = job.steps.some(
          (s) => s.env?.['RENDER_API_KEY'] || s.env?.['RENDER_SERVICE_URL'],
        );
        expect(hasEnvSecrets).toBe(true);
      });

      it('should fetch previous deploy and trigger rollback', () => {
        const job = workflow.jobs['rollback']!;
        const stepRuns = job.steps.map((s) => s.run ?? '').join('\n');
        expect(stepRuns).toContain('deploys');
        expect(stepRuns).toContain('Rollback');
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
