import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Pin the parser's project root explicitly. Without this, typescript-eslint
// auto-discovers every tsconfig.json under the cwd; a stray nested checkout
// (e.g. .kilo/worktrees/*) produces "multiple candidate TSConfigRootDirs" and
// every single file fails to parse.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig([
  // `.kilo` holds throwaway agent worktrees with their own copies of the repo;
  // linting them double-reports everything and breaks root-dir discovery.
  // `server/` is a separate package with its own tsconfig + Jest runner and is
  // not part of the frontend build, so it is excluded here deliberately.
  globalIgnores([
    'dist',
    'server',
    'piston',
    '.kilo',
    'node_modules',
    '**/node_modules',
  ]),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],

    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: [path.join(__dirname, 'tsconfig.app.json')],
        tsconfigRootDir: __dirname,
      },
    },
  },
  // Build tooling at the repo root isn't part of the app's tsconfig project.
  // It still needs the TS parser, otherwise the default JS parser chokes on
  // `import type` / type annotations ("Parsing error: Unexpected token").
  {
    files: ['vite.config.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
])
