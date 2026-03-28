const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Resolve .js imports to .ts source files in workspace packages.
// The shared package uses NodeNext module resolution which requires .js
// extensions in imports, but Metro needs to find the actual .ts files.
// Only applies to imports originating from the packages/ directory to
// avoid interfering with node_modules resolution (CSS modules, etc.).
const packagesDir = path.resolve(monorepoRoot, 'packages');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith('.js') && context.originModulePath.startsWith(packagesDir)) {
    const tsName = moduleName.replace(/\.js$/, '.ts');
    try {
      return context.resolveRequest(context, tsName, platform);
    } catch {
      // Fall through to default resolution
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
