import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...compat.extends('next/core-web-vitals'),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // Disable strict rules that might cause build issues
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-unused-vars': 'off', // Turn off base rule as it conflicts with TypeScript
      'no-undef': 'off', // TypeScript handles this
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**'],
  },
];
