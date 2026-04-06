import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		// Vitest + jsdom otherwise resolves Prisma's browser stub without enums.
		alias: {
			'@prisma/client': path.resolve(root, 'node_modules/.prisma/client/index.js'),
		},
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		// Prisma enum exports can be undefined when many test files load in parallel (Vitest workers).
		fileParallelism: false,
	},
});
