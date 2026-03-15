import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const mobileRoot = resolve(__dirname, '..');

function readJson(relativePath: string): Record<string, unknown> {
  const content = readFileSync(resolve(mobileRoot, relativePath), 'utf-8');
  return JSON.parse(content) as Record<string, unknown>;
}

describe('Expo project configuration', () => {
  describe('package.json', () => {
    const pkg = readJson('package.json') as Record<string, unknown>;
    const scripts = pkg['scripts'] as Record<string, string>;
    const deps = pkg['dependencies'] as Record<string, string>;

    it('should have expo-router/entry as main', () => {
      expect(pkg['main']).toBe('expo-router/entry');
    });

    it('should have a dev script that runs expo start', () => {
      expect(scripts['dev']).toBe('expo start');
    });

    it('should have a typecheck script', () => {
      expect(scripts['typecheck']).toBe('tsc --noEmit');
    });

    it('should depend on expo SDK 52+', () => {
      expect(deps['expo']).toMatch(/^~5[2-9]/);
    });

    it('should depend on expo-router', () => {
      expect(deps['expo-router']).toBeDefined();
    });

    it('should depend on react and react-native', () => {
      expect(deps['react']).toBeDefined();
      expect(deps['react-native']).toBeDefined();
    });

    it('should depend on react-native-screens and safe-area-context', () => {
      expect(deps['react-native-screens']).toBeDefined();
      expect(deps['react-native-safe-area-context']).toBeDefined();
    });
  });

  describe('app.json', () => {
    const appJson = readJson('app.json') as { expo: Record<string, unknown> };
    const expo = appJson['expo'];

    it('should have app name FillIt', () => {
      expect(expo['name']).toBe('FillIt');
    });

    it('should have a URL scheme', () => {
      expect(expo['scheme']).toBe('fillit');
    });

    it('should have expo-router plugin', () => {
      const plugins = expo['plugins'] as string[];
      expect(plugins).toContain('expo-router');
    });

    it('should target ios and android platforms', () => {
      const platforms = expo['platforms'] as string[];
      expect(platforms).toContain('ios');
      expect(platforms).toContain('android');
    });

    it('should have typed routes enabled', () => {
      const experiments = expo['experiments'] as Record<string, boolean>;
      expect(experiments['typedRoutes']).toBe(true);
    });
  });

  describe('TypeScript config', () => {
    const tsconfig = readJson('tsconfig.json') as Record<string, unknown>;
    const compilerOptions = tsconfig['compilerOptions'] as Record<
      string,
      unknown
    >;

    it('should extend expo/tsconfig.base', () => {
      expect(tsconfig['extends']).toBe('expo/tsconfig.base');
    });

    it('should have strict mode enabled', () => {
      expect(compilerOptions['strict']).toBe(true);
    });
  });

  describe('File structure', () => {
    it('should have app/_layout.tsx', () => {
      expect(existsSync(resolve(mobileRoot, 'app/_layout.tsx'))).toBe(true);
    });

    it('should have app/index.tsx', () => {
      expect(existsSync(resolve(mobileRoot, 'app/index.tsx'))).toBe(true);
    });

    it('should have babel.config.js', () => {
      expect(existsSync(resolve(mobileRoot, 'babel.config.js'))).toBe(true);
    });

    it('should have metro.config.js', () => {
      expect(existsSync(resolve(mobileRoot, 'metro.config.js'))).toBe(true);
    });

    it('should not have old src/index.ts placeholder', () => {
      expect(existsSync(resolve(mobileRoot, 'src/index.ts'))).toBe(false);
    });
  });
});
