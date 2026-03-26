import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

export default ts.config(
	js.configs.recommended,
	...svelte.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				parseForESLint: svelteConfig.preprocess
			}
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'svelte/no-at-html-tags': 'off'
		}
	},
	{
		ignores: ['node_modules', 'build', '.svelte-kit', 'package', 'pnpm-lock.yaml']
	}
);
