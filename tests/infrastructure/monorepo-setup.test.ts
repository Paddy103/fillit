import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');

function readJson(relativePath: string) {
  const content = readFileSync(resolve(ROOT, relativePath), 'utf-8');
  return JSON.parse(content);
}

function readFile(relativePath: string) {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

function fileExists(relativePath: string) {
  return existsSync(resolve(ROOT, relativePath));
}

function run(cmd: string) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', timeout: 30_000 });
}

// ---------------------------------------------------------------------------
// 1. Workspace structure — all expected files exist
// ---------------------------------------------------------------------------
describe('Workspace structure', () => {
  const requiredFiles = [
    'package.json',
    'pnpm-workspace.yaml',
    'tsconfig.base.json',
    '.eslintrc.js',
    '.prettierrc',
    '.prettierignore',
    '.gitignore',
    'apps/mobile/package.json',
    'apps/mobile/tsconfig.json',
    'packages/shared/package.json',
    'packages/shared/tsconfig.json',
    'packages/shared/src/index.ts',
    'apps/server/package.json',
    'apps/server/tsconfig.json',
  ];

  it.each(requiredFiles)('file exists: %s', (file) => {
    expect(fileExists(file)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Root package.json — correct metadata and scripts
// ---------------------------------------------------------------------------
describe('Root package.json', () => {
  const pkg = readJson('package.json');

  it('is marked private', () => {
    expect(pkg.private).toBe(true);
  });

  it('declares pnpm as packageManager', () => {
    expect(pkg.packageManager).toMatch(/^pnpm@/);
  });

  it('requires node >= 18', () => {
    expect(pkg.engines?.node).toBeDefined();
    expect(pkg.engines.node).toMatch(/>=\s*18/);
  });

  it('has lint script', () => {
    expect(pkg.scripts?.lint).toBeDefined();
  });

  it('has format:check script', () => {
    expect(pkg.scripts?.['format:check']).toBeDefined();
  });

  it('has typecheck script', () => {
    expect(pkg.scripts?.typecheck).toBeDefined();
  });

  it('has clean script', () => {
    expect(pkg.scripts?.clean).toBeDefined();
  });

  it('has required devDependencies', () => {
    const devDeps = Object.keys(pkg.devDependencies ?? {});
    expect(devDeps).toEqual(
      expect.arrayContaining([
        'typescript',
        'eslint',
        'prettier',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        'eslint-config-prettier',
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// 3. pnpm workspace configuration
// ---------------------------------------------------------------------------
describe('pnpm workspace', () => {
  const workspaceYaml = readFile('pnpm-workspace.yaml');

  it('declares apps/mobile workspace', () => {
    expect(workspaceYaml).toContain('apps/mobile');
  });

  it('declares packages/shared workspace', () => {
    expect(workspaceYaml).toContain('packages/shared');
  });

  it('declares apps/server workspace', () => {
    expect(workspaceYaml).toContain('apps/server');
  });
});

// ---------------------------------------------------------------------------
// 4. Workspace package.json files — names and structure
// ---------------------------------------------------------------------------
describe('Workspace packages', () => {
  describe('apps/mobile', () => {
    const pkg = readJson('apps/mobile/package.json');

    it('has name fillit-mobile', () => {
      expect(pkg.name).toBe('fillit-mobile');
    });

    it('is marked private', () => {
      expect(pkg.private).toBe(true);
    });

    it('has typecheck script', () => {
      expect(pkg.scripts?.typecheck).toBeDefined();
    });
  });

  describe('packages/shared', () => {
    const pkg = readJson('packages/shared/package.json');

    it('has name @fillit/shared', () => {
      expect(pkg.name).toBe('@fillit/shared');
    });

    it('has main pointing to src/index.ts', () => {
      expect(pkg.main).toBe('src/index.ts');
    });

    it('has types entry', () => {
      expect(pkg.types).toBeDefined();
    });

    it('has build and typecheck scripts', () => {
      expect(pkg.scripts?.build).toBeDefined();
      expect(pkg.scripts?.typecheck).toBeDefined();
    });
  });

  describe('apps/server', () => {
    const pkg = readJson('apps/server/package.json');

    it('has name fillit-server', () => {
      expect(pkg.name).toBe('fillit-server');
    });

    it('is marked private', () => {
      expect(pkg.private).toBe(true);
    });

    it('uses ESM (type: module)', () => {
      expect(pkg.type).toBe('module');
    });

    it('has hono dependency', () => {
      expect(pkg.dependencies?.hono).toBeDefined();
    });

    it('has dev, build, start, and typecheck scripts', () => {
      expect(pkg.scripts?.dev).toBeDefined();
      expect(pkg.scripts?.build).toBeDefined();
      expect(pkg.scripts?.start).toBeDefined();
      expect(pkg.scripts?.typecheck).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// 5. TypeScript configuration
// ---------------------------------------------------------------------------
describe('TypeScript configuration', () => {
  describe('tsconfig.base.json', () => {
    const tsconfig = readJson('tsconfig.base.json');
    const opts = tsconfig.compilerOptions;

    it('enables strict mode', () => {
      expect(opts.strict).toBe(true);
    });

    it('targets ES2022', () => {
      expect(opts.target).toBe('ES2022');
    });

    it('uses NodeNext module resolution', () => {
      expect(opts.module).toBe('NodeNext');
      expect(opts.moduleResolution).toBe('NodeNext');
    });

    it('enables declaration and sourceMap', () => {
      expect(opts.declaration).toBe(true);
      expect(opts.sourceMap).toBe(true);
    });

    it('enables strict index access', () => {
      expect(opts.noUncheckedIndexedAccess).toBe(true);
    });

    it('enables noUnusedLocals and noUnusedParameters', () => {
      expect(opts.noUnusedLocals).toBe(true);
      expect(opts.noUnusedParameters).toBe(true);
    });

    it('excludes node_modules, dist, coverage', () => {
      expect(tsconfig.exclude).toEqual(
        expect.arrayContaining(['node_modules', 'dist', 'coverage']),
      );
    });
  });

  describe('workspace tsconfigs extend base', () => {
    it('packages/shared extends ../../tsconfig.base.json', () => {
      const tsconfig = readJson('packages/shared/tsconfig.json');
      expect(tsconfig.extends).toBe('../../tsconfig.base.json');
    });

    it('apps/mobile extends ../../tsconfig.base.json', () => {
      const tsconfig = readJson('apps/mobile/tsconfig.json');
      expect(tsconfig.extends).toBe('../../tsconfig.base.json');
    });

    it('apps/server extends ../../tsconfig.base.json', () => {
      const tsconfig = readJson('apps/server/tsconfig.json');
      expect(tsconfig.extends).toBe('../../tsconfig.base.json');
    });

    it('apps/mobile tsconfig enables JSX', () => {
      const tsconfig = readJson('apps/mobile/tsconfig.json');
      expect(tsconfig.compilerOptions?.jsx).toBeDefined();
    });
  });

  describe('TypeScript compilation', () => {
    it('packages/shared typechecks without errors', () => {
      expect(() => {
        run('npx tsc -p packages/shared/tsconfig.json --noEmit');
      }).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// 6. ESLint configuration
// ---------------------------------------------------------------------------
describe('ESLint configuration', () => {
  const eslintConfig = readFile('.eslintrc.js');

  it('sets root: true', () => {
    expect(eslintConfig).toContain('root: true');
  });

  it('uses @typescript-eslint/parser', () => {
    expect(eslintConfig).toContain("'@typescript-eslint/parser'");
  });

  it('extends @typescript-eslint/recommended', () => {
    expect(eslintConfig).toContain("'plugin:@typescript-eslint/recommended'");
  });

  it('extends prettier to disable conflicting rules', () => {
    expect(eslintConfig).toContain("'prettier'");
  });

  it('ignores node_modules, dist, coverage', () => {
    expect(eslintConfig).toContain('node_modules/');
    expect(eslintConfig).toContain('dist/');
    expect(eslintConfig).toContain('coverage/');
  });

  it('pnpm run lint executes without errors', () => {
    expect(() => {
      run('pnpm run lint');
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7. Prettier configuration
// ---------------------------------------------------------------------------
describe('Prettier configuration', () => {
  const prettierConfig = readJson('.prettierrc');

  it('uses single quotes', () => {
    expect(prettierConfig.singleQuote).toBe(true);
  });

  it('uses trailing commas (all)', () => {
    expect(prettierConfig.trailingComma).toBe('all');
  });

  it('uses 2-space indent', () => {
    expect(prettierConfig.tabWidth).toBe(2);
  });

  it('enables semicolons', () => {
    expect(prettierConfig.semi).toBe(true);
  });

  it('pnpm run format:check executes without errors', () => {
    expect(() => {
      run('pnpm run format:check');
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 8. .gitignore patterns
// ---------------------------------------------------------------------------
describe('.gitignore', () => {
  const gitignore = readFile('.gitignore');

  it('ignores node_modules/', () => {
    expect(gitignore).toContain('node_modules/');
  });

  it('ignores dist/', () => {
    expect(gitignore).toContain('dist/');
  });

  it('ignores .env files', () => {
    expect(gitignore).toContain('.env');
  });

  it('ignores coverage/', () => {
    expect(gitignore).toContain('coverage/');
  });

  it('ignores .expo/', () => {
    expect(gitignore).toContain('.expo/');
  });

  it('ignores IDE files (.idea/, .vscode/)', () => {
    expect(gitignore).toContain('.idea/');
    expect(gitignore).toContain('.vscode/');
  });

  it('ignores OS files (.DS_Store, Thumbs.db)', () => {
    expect(gitignore).toContain('.DS_Store');
    expect(gitignore).toContain('Thumbs.db');
  });
});

// ---------------------------------------------------------------------------
// 9. pnpm workspace resolution
// ---------------------------------------------------------------------------
describe('pnpm workspace resolution', () => {
  it('pnpm ls -r lists all 4 workspace projects', () => {
    const output = run('pnpm ls -r --depth 0');
    expect(output).toContain('fillit');
    expect(output).toContain('fillit-mobile');
    expect(output).toContain('@fillit/shared');
    expect(output).toContain('fillit-server');
  });
});

// ---------------------------------------------------------------------------
// 10. @fillit/shared barrel export
// ---------------------------------------------------------------------------
describe('@fillit/shared barrel export', () => {
  const indexContent = readFile('packages/shared/src/index.ts');

  it('exports PACKAGE_NAME constant', () => {
    expect(indexContent).toContain('PACKAGE_NAME');
  });

  it('PACKAGE_NAME value is @fillit/shared', () => {
    expect(indexContent).toContain("'@fillit/shared'");
  });
});
