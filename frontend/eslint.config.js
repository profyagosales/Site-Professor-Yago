import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="navigate"] > Literal[value^="/"]',
          message: 'Use ROUTES constants instead of hardcoded paths in navigate() calls'
        },
        {
          selector: 'JSXAttribute[name.name="to"] > Literal[value^="/"]',
          message: 'Use ROUTES constants instead of hardcoded paths in Link to prop'
        },
        {
          selector: 'JSXAttribute[name.name="href"] > Literal[value^="/"]',
          message: 'Use ROUTES constants instead of hardcoded paths in href attributes'
        }
      ]
    },
  },
])
