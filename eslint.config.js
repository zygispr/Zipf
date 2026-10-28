import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Atomic design import rule (contracts/ui-components.md): a level may import only from lower
// levels. Each level lists the component levels above it.
const HIGHER_LEVELS = {
  atoms: ['molecules', 'organisms', 'templates', 'pages'],
  molecules: ['organisms', 'templates', 'pages'],
  organisms: ['templates', 'pages'],
  templates: ['pages'],
};

// Components below pages/ receive data only through props (research R14).
const NO_CONTEXT = {
  name: 'react',
  importNames: ['createContext', 'useContext'],
  message: 'Components below pages/ receive data through props only. No Context (research R14).',
};

const PRIVACY_MESSAGE = 'Book data must never leave the device or be stored (FR-004)';
const BANNED_GLOBALS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'localStorage',
  'sessionStorage',
  'indexedDB',
];

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // A leading underscore marks a parameter that is intentionally unused.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    // Plain JS config files have no type information worth checking.
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  ...Object.entries(HIGHER_LEVELS).map(([level, higher]) => ({
    files: [`src/components/${level}/**`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [NO_CONTEXT],
          patterns: higher.map((name) => ({
            group: [`**/${name}/**`],
            message: `${level} may not import ${name} (atomic design import rule).`,
          })),
        },
      ],
    },
  })),
  {
    // Code-level privacy guard. It also covers the worker, which the page CSP does not reach
    // (research R2).
    files: ['src/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...BANNED_GLOBALS.map((name) => ({ name, message: PRIVACY_MESSAGE })),
      ],
      'no-restricted-properties': [
        'error',
        ...[...BANNED_GLOBALS, 'sendBeacon'].map((property) => ({
          property,
          message: PRIVACY_MESSAGE,
        })),
      ],
    },
  },
);
