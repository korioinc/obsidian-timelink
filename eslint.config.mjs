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
const obsidianRecommended = obsidianmd.configs?.recommended ?? [];

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mjs', 'manifest.json'],
				},
				tsconfigRootDir: __dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianRecommended,
	{
		files: ['**/*.{ts,tsx}'],
		plugins: {
			obsidianmd,
			import: importPlugin,
			prettier,
			promise: pluginPromise,
		},
		rules: {
			'@microsoft/sdl/no-inner-html': 'off',
			'no-alert': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
			'@typescript-eslint/no-misused-promises': ['warn', { checksVoidReturn: false }],
			'@typescript-eslint/no-floating-promises': 'warn',
			'obsidianmd/ui/sentence-case': 'warn',
			'import/order': 'off',
			'promise/catch-or-return': 'warn',
			'promise/always-return': 'off',
			'promise/no-nesting': 'warn',
			'promise/no-return-wrap': 'warn',
			'promise/param-names': 'warn',
			'promise/no-promise-in-callback': 'warn',
			'promise/no-callback-in-promise': 'warn',
			'promise/avoid-new': 'warn',
			'promise/no-new-statics': 'warn',
			'promise/no-return-in-finally': 'warn',
			'prettier/prettier': 'warn',
		},
	},
	{
		files: ['src/calendar/utils/**/__tests__/*.test.ts', 'src/calendar/utils/*.test.ts'],
		rules: {
			'import/no-nodejs-modules': 'off',
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
		'tmp-plugins',
	]),
);
