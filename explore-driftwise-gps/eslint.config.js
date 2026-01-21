import js from '@eslint/js';
import typescript from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...typescript.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: typescript.parser,
      },
    },
  },
  {
    ignores: [
      'node_modules',
      'dist',
      '.svelte-kit',
      'build',
      'coverage',
      '**/*.config.js',
    ],
  },
];
