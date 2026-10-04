import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '.preview/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    plugins: { react, 'react-hooks': hooks },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
];
