/* global document, getComputedStyle, window */

import {
	createCorpus,
	createRenderingProbe,
	loadBenchmarkFont,
} from './text-rendering-corpus.js';

const modeId = document.documentElement.dataset.rendering;
const mode = modeId === 'speed'
	? {
		label: 'optimizeSpeed',
		otherId: 'legibility',
		otherLabel: 'optimizeLegibility',
	}
	: {
		label: 'optimizeLegibility',
		otherId: 'speed',
		otherLabel: 'optimizeSpeed',
	};
const searchParameters = new URLSearchParams(window.location.search);
const requestedParagraphCount = Number.parseInt(searchParameters.get('paragraphs'), 10);
const paragraphCount = Number.isFinite(requestedParagraphCount)
	? Math.min(2000, Math.max(100, requestedParagraphCount))
	: 2000;
const profileStatus = document.querySelector('#profile-status');
const profileComputedValue = document.querySelector('#profile-computed-value');
const profileFont = document.querySelector('#profile-font');
const profileProbeWidth = document.querySelector('#profile-probe-width');
const profileParagraphCount = document.querySelector('#profile-paragraph-count');
const profileProbe = document.querySelector('#profile-probe');
const profileCorpus = document.querySelector('#profile-corpus');
const rerenderButton = document.querySelector('#rerender-profile');
const otherProfileLink = document.querySelector('#other-profile-link');

let renderSequence = 0;

const renderCorpus = () => {
	renderSequence++;
	profileStatus.textContent = `Rendering ${paragraphCount} paragraphs with ${mode.label}…`;

	const probe = createRenderingProbe();
	const corpus = createCorpus(paragraphCount, {
		sampleId: `${modeId}-${renderSequence}`,
		shouldIncludeParagraphIdentifiers: false,
	});
	const measureName = `${mode.label} render ${renderSequence}`;
	const startMark = `${measureName} start`;
	const layoutMark = `${measureName} layout complete`;

	performance.mark(startMark);
	profileProbe.replaceChildren(probe);
	profileCorpus.replaceChildren(corpus);

	const computedStyle = getComputedStyle(corpus);
	const probeWidth = probe.getBoundingClientRect().width;
	const corpusHeight = corpus.getBoundingClientRect().height;

	performance.mark(layoutMark);
	performance.measure(measureName, startMark, layoutMark);

	profileComputedValue.textContent = computedStyle.textRendering;
	profileFont.textContent = computedStyle.fontFamily;
	profileProbeWidth.textContent = `${probeWidth.toFixed(2)} px`;
	profileParagraphCount.textContent = new Intl.NumberFormat().format(paragraphCount);
	profileStatus.textContent = `Layout complete: ${corpusHeight.toFixed(2)} px tall. Scroll to exercise painting.`;
};

otherProfileLink.href = `./text-rendering-${mode.otherId}.html?paragraphs=${paragraphCount}`;
otherProfileLink.textContent = `Open ${mode.otherLabel}`;
rerenderButton.addEventListener('click', renderCorpus);

await loadBenchmarkFont();
renderCorpus();
rerenderButton.disabled = false;
