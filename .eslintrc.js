/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    // ─── TypeScript ────────────────────────────────────────────
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],

    // ─── Code smells ───────────────────────────────────────────
    complexity: ['warn', 15],
    'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
    'max-depth': ['warn', 4],
    'max-params': ['warn', 5],
    'no-duplicate-imports': 'error',

    // ─── Reuse & maintainability ───────────────────────────────
    'no-restricted-syntax': [
      'warn',
      {
        selector: 'TSTypeReference[typeName.name="any"]',
        message: 'Avoid `any` — use a specific type, `unknown`, or a generic.',
      },
    ],
  },
  ignorePatterns: ['node_modules/', 'dist/', 'coverage/', '.expo/'],
  overrides: [
    {
      files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
      rules: {
        'max-lines-per-function': 'off',
      },
    },
  ],
};
