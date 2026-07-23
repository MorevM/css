/* global document, getComputedStyle, requestAnimationFrame */

import {
	createCorpus,
	createRenderingProbe,
	loadBenchmarkFont,
} from './text-rendering-corpus.js';

const paragraphCountInput = document.querySelector('#paragraph-count');
const runCountInput = document.querySelector('#run-count');
const runButton = document.querySelector('#run-benchmark');
const benchmarkStatus = document.querySelector('#benchmark-status');
const benchmarkSummary = document.querySelector('#benchmark-summary');
const measurementStage = document.querySelector('#measurement-stage');
const legibilityPreview = document.querySelector('#legibility-preview');
const speedPreview = document.querySelector('#speed-preview');
const legibilityProfileLink = document.querySelector('#legibility-profile-link');
const speedProfileLink = document.querySelector('#speed-profile-link');
const renderModes = [
	{
		id: 'legibility',
		label: 'optimizeLegibility',
		computedOutput: document.querySelector('#legibility-computed'),
		layoutOutput: document.querySelector('#legibility-layout'),
		probeOutput: document.querySelector('#legibility-probe'),
		heightOutput: document.querySelector('#legibility-height'),
	},
	{
		id: 'speed',
		label: 'optimizeSpeed',
		computedOutput: document.querySelector('#speed-computed'),
		layoutOutput: document.querySelector('#speed-layout'),
		probeOutput: document.querySelector('#speed-probe'),
		heightOutput: document.querySelector('#speed-height'),
	},
];

let benchmarkSequence = 0;
let isRunning = false;

const getBoundedInteger = (input, minimum, maximum) => {
	const value = Number.parseInt(input.value, 10);
	const boundedValue = Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : minimum;

	input.value = String(boundedValue);
	return boundedValue;
};

const renderPreviews = () => {
	legibilityPreview.replaceChildren(createRenderingProbe(), createCorpus(80));
	speedPreview.replaceChildren(createRenderingProbe(), createCorpus(80));
};

const updateProfileLinks = () => {
	const paragraphCount = getBoundedInteger(paragraphCountInput, 100, 2000);

	legibilityProfileLink.href = `./text-rendering-legibility.html?paragraphs=${paragraphCount}`;
	speedProfileLink.href = `./text-rendering-speed.html?paragraphs=${paragraphCount}`;
};

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const measureMode = async (mode, paragraphCount, sampleId) => {
	const corpus = createCorpus(paragraphCount, { sampleId });
	const probe = createRenderingProbe();

	measurementStage.dataset.rendering = mode.id;
	measurementStage.replaceChildren();
	await nextFrame();

	const startedAt = performance.now();

	measurementStage.replaceChildren(probe, corpus);

	const computedValue = getComputedStyle(probe).textRendering;
	const renderedHeight = corpus.getBoundingClientRect().height;
	const probeWidth = probe.getBoundingClientRect().width;
	const layoutFinishedAt = performance.now();

	measurementStage.replaceChildren();

	return {
		computedValue,
		layoutDuration: layoutFinishedAt - startedAt,
		probeWidth,
		renderedHeight,
	};
};

const getMedian = (values) => {
	const sortedValues = values.toSorted((first, second) => first - second);
	const middleIndex = Math.floor(sortedValues.length / 2);

	if (sortedValues.length % 2 === 1) return sortedValues[middleIndex];

	return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
};

const formatDuration = (duration) => `${duration.toFixed(2)} ms`;
const formatPixels = (value) => `${new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 2,
	minimumFractionDigits: 2,
}).format(value)} px`;

const renderResults = (results) => {
	for (const mode of renderModes) {
		const samples = results.get(mode.id);

		mode.computedOutput.textContent = samples[0].computedValue;
		mode.layoutOutput.textContent = formatDuration(getMedian(
			samples.map((sample) => sample.layoutDuration),
		));
		mode.probeOutput.textContent = formatPixels(getMedian(
			samples.map((sample) => sample.probeWidth),
		));
		mode.heightOutput.textContent = formatPixels(getMedian(
			samples.map((sample) => sample.renderedHeight),
		));
	}

	const legibilitySamples = results.get('legibility');
	const speedSamples = results.get('speed');
	const legibilityMedian = getMedian(legibilitySamples.map((sample) => sample.layoutDuration));
	const speedMedian = getMedian(speedSamples.map((sample) => sample.layoutDuration));
	const legibilityProbeWidth = getMedian(legibilitySamples.map((sample) => sample.probeWidth));
	const speedProbeWidth = getMedian(speedSamples.map((sample) => sample.probeWidth));
	const fasterMode = legibilityMedian <= speedMedian ? renderModes[0] : renderModes[1];
	const slowerDuration = Math.max(legibilityMedian, speedMedian);
	const fasterDuration = Math.min(legibilityMedian, speedMedian);
	const timingDifference = fasterDuration === 0 ? 0 : (slowerDuration / fasterDuration - 1) * 100;
	const probeDifference = Math.abs(legibilityProbeWidth - speedProbeWidth);
	const timingSummary = timingDifference < 1
		? 'The median style + shaping + layout timings are within 1% in this run.'
		: `${fasterMode.label} had a ${timingDifference.toFixed(1)}% lower median style + shaping + layout time.`;
	const probeSummary = probeDifference < .01
		? 'The control line has the same width, so this browser and font expose no geometric difference.'
		: `The control line widths differ by ${formatPixels(probeDifference)}, confirming a geometric effect.`;

	benchmarkSummary.textContent = `${timingSummary} ${probeSummary}`;
};

const runBenchmark = async () => {
	if (isRunning) return;

	isRunning = true;
	benchmarkSequence++;
	runButton.disabled = true;

	const paragraphCount = getBoundedInteger(paragraphCountInput, 100, 2000);
	const runCount = getBoundedInteger(runCountInput, 3, 15);
	const results = new Map(renderModes.map((mode) => [mode.id, []]));

	updateProfileLinks();

	try {
		benchmarkStatus.textContent = 'Waiting for fonts…';
		await document.fonts.ready;

		for (let runIndex = 0; runIndex < runCount; runIndex++) {
			const orderedModes = runIndex % 2 === 0 ? renderModes : renderModes.toReversed();
			const sampleId = `${benchmarkSequence}-${runIndex + 1}`;

			for (const mode of orderedModes) {
				benchmarkStatus.textContent = `Run ${runIndex + 1} of ${runCount}: ${mode.label}…`;
				// eslint-disable-next-line no-await-in-loop -- Concurrent samples would contend for the same rendering thread.
				const measurement = await measureMode(mode, paragraphCount, sampleId);

				results.get(mode.id).push(measurement);
			}
		}

		renderResults(results);
		benchmarkStatus.textContent = `Completed ${runCount} recorded runs with ${paragraphCount} paragraphs per mode.`;
	} finally {
		measurementStage.replaceChildren();
		runButton.disabled = false;
		isRunning = false;
	}
};

paragraphCountInput.addEventListener('change', updateProfileLinks);
runButton.addEventListener('click', runBenchmark);

await loadBenchmarkFont();
renderPreviews();
updateProfileLinks();
