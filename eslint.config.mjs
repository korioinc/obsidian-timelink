import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import eslintJson from '@eslint/json';
import tsparser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import obsidianmd from 'eslint-plugin-obsidianmd';
import prettier from 'eslint-plugin-prettier';
import pluginPromise from 'eslint-plugin-promise';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mjs', 'manifest.json', 'vitest.config.ts'],
				},
				tsconfigRootDir: __dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				// Keep projectService in the shared block above; typescript-eslint treats
				// parserOptions.project and parserOptions.projectService as alternatives.
				tsconfigRootDir: __dirname,
			},
		},
		plugins: {
			'eslint-comments': eslintComments,
			obsidianmd,
			import: importPlugin,
			prettier,
			promise: pluginPromise,
		},
		rules: {
			'@typescript-eslint/require-await': 'error',
			'eslint-comments/disable-enable-pair': 'error',
			'eslint-comments/no-restricted-disable': ['error', 'obsidianmd/no-tfile-tfolder-cast'],
			'prettier/prettier': 'error',
		},
	},
	{
		files: ['**/*.{js,mjs,cjs}'],
		plugins: {
			prettier,
		},
		rules: {
			'prettier/prettier': 'error',
		},
	},
	{
		files: ['manifest.json'],
		language: 'json/json',
		plugins: {
			json: eslintJson,
			obsidianmd,
		},
		rules: {
			'no-irregular-whitespace': 'off',
			'obsidianmd/validate-manifest': 'error',
		},
	},
	{
		files: ['package.json'],
		rules: {
			'depend/ban-dependencies': 'off',
		},
	},
	eslintConfigPrettier,
	globalIgnores([
		'node_modules',
		'dist',
		'esbuild.config.mjs',
		'eslint.config.js',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'styles.css',
	]),
);
