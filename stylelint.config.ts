import { defineConfig } from '@morev/stylelint-config';

export default defineConfig({
	bem: {
		files: ['./src/components/**/*.{css,scss}'],
	},
});
