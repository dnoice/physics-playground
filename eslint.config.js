/*
✒ Metadata
    - Title: Lint Configuration (digiSpace Edition - v2.1)
    - File Name: eslint.config.js
    - Relative Path: eslint.config.js
    - Artifact Type: config
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Corrected
      the ESLint version and Node.js floor in the header.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: a formal stack.

✒ Description:
    ESLint flat config for the browser modules and Node tools: undefined
    names, imports reassigned and unused variables.

✒ Key Features:
    - Browser globals for js/, Node globals for tools/.
    - Catch bindings and _-prefixed names may go unused.
    - Vendored code is ignored.

✒ Usage Instructions:
    $ npm run lint

✒ Other Important Information:
    - Dependencies: eslint 10 and globals (dev dependencies)
    - Compatible platforms: Node.js 20.19+
---------
*/
import globals from 'globals';

export default [
  { ignores: ['vendor/**', 'node_modules/**'] },
  {
    files: ['js/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser } },
    rules: {
      'no-undef': 'error',
      'no-import-assign': 'error',
      'no-redeclare': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tools/**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
    rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }] },
  },
];
