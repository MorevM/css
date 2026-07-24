import { defineConfig } from '@morev/stylelint-config';

export default defineConfig({
	bem: {
		files: ['./src/components/**/*.{css,scss}'],
	},
}, {
	overrides: [
		{
			files: ['./src/reset/**/*.css'],
			rules: {
				// Keep semantic concerns separate even when selectors repeat.
				'no-duplicate-selectors': null,
			},
		},
	],
});
