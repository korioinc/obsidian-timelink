import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import eslintJson from '@eslint/json';
import tsparser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import obsidianmd from 'eslint-plugin-obsidianmd';
import prettier from 'eslint-plugin-prettier';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const obsidianTypedRules = {
	'obsidianmd/no-plugin-as-component': 'off',
	'obsidianmd/no-unsupported-api': 'off',
	'obsidianmd/no-view-references-in-plugin': 'off',
	'obsidianmd/prefer-file-manager-trash-file': 'off',
	'obsidianmd/prefer-instanceof': 'off',
};

export default tseslint.config(
	...obsidianmd.configs.recommended,
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: __dirname,
			},
		},
		plugins: {
			'eslint-comments': eslintComments,
			obsidianmd,
			prettier,
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
		languageOptions: {
			globals: globals.node,
		},
		plugins: {
			prettier,
		},
		rules: {
			...obsidianTypedRules,
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
			...obsidianTypedRules,
			'no-irregular-whitespace': 'off',
			'obsidianmd/validate-manifest': 'error',
		},
	},
	{
		files: ['package.json'],
		rules: {
			...obsidianTypedRules,
			'depend/ban-dependencies': 'off',
		},
	},
	eslintConfigPrettier,
	globalIgnores([
		'node_modules',
		'dist',
		'eslint.config.mjs',
		'versions.json',
		'main.js',
		'styles.css',
	]),
);
