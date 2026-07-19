import { defineConfig } from 'tsdown';

export default defineConfig({
	sourcemap: false,
	clean: true,
	target: 'esnext',
	format: ['esm'],
	dts: {
		entry: 'src/index.ts',
	},
	entry: [
		'src/index.ts',
	],
});
