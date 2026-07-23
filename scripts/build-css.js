import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncArray } from '@morev/utils';
import { transform } from 'esbuild';

const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
const sourceDirectory = join(projectDirectory, 'src', 'reset');
const outputDirectory = join(projectDirectory, 'dist');
const layerNames = ['core', 'base', 'reduced-motion'];

const minifyCss = async (code, sourcefile) => {
	const result = await transform(code, {
		loader: 'css',
		minifyWhitespace: true,
		sourcefile,
		target: 'esnext',
	});

	return result.code;
};

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(join(outputDirectory, 'reset'), { recursive: true });

const layerEntries = await asyncArray(layerNames)
	.map(async (layerName) => {
		const filename = `${layerName}.css`;
		const sourcePath = join(sourceDirectory, filename);
		const outputPath = join(outputDirectory, 'reset', filename);
		const source = await readFile(sourcePath, 'utf8');

		await copyFile(sourcePath, outputPath);
		await writeFile(
			join(outputDirectory, 'reset', `${layerName}.min.css`),
			await minifyCss(source, sourcePath),
		);

		return [layerName, source];
	});
const layers = new Map(layerEntries);

const resetSource = `${layers.get('core')}\n${layers.get('base')}`;
const resetPath = join(outputDirectory, 'reset.css');

await writeFile(resetPath, resetSource);
await writeFile(
	join(outputDirectory, 'reset.min.css'),
	await minifyCss(resetSource, resetPath),
);
