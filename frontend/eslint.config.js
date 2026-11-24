import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['dist']),
    {
        files: ['**/*.{js,jsx}'],
        extends: [
            js.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.browser,
            parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
        },
        rules: {
            // Allow intentionally unused names written in capitals or starting with an underscore
            'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
        },
    },
    {
        // Node test files and build config
        files: ['tests/**/*.js', '*.config.js'],
        languageOptions: { globals: globals.node },
    },
]);
