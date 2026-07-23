/* global ResizeObserver, document, requestAnimationFrame, window */

const searchParameters = new URLSearchParams(window.location.search);
const hasReset = searchParameters.get('mode') === 'reset';
const reducedMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

let hasControlsStyles = hasReset && searchParameters.get('controls') === '1';
let hasReducedMotionStyles = hasReset && searchParameters.get('motion') === '1';

const renderMode = () => {
	document.querySelector('#mode-label').textContent = hasReset
		? 'Reset styles enabled'
		: 'Native browser reference';
	document.querySelector('#preference-badge').textContent = reducedMotionPreference.matches
		? 'OS preference: reduce'
		: 'OS preference: no-preference';
	document.querySelector('#controls-badge').title = hasControlsStyles
		? 'The optional stylesheet is loaded'
		: 'The optional stylesheet is not loaded';
	document.querySelector('#motion-badge').title = hasReducedMotionStyles
		? 'The optional stylesheet is loaded'
		: 'The optional stylesheet is not loaded';
};

const notifyInspector = () => {
	if (window.parent === window) return;

	window.parent.postMessage({ type: 'inspector-state-changed' }, window.location.origin);
};

const formatPixelValue = (value) => `${value.toFixed(2).replace(/\.00$/, '')}px`;

const renderDateTimeMeasurements = () => {
	for (const output of document.querySelectorAll('[data-size-for]')) {
		const target = document.querySelector(output.dataset.sizeFor);

		if (!target) continue;

		const rectangle = target.getBoundingClientRect();
		const nextText = `${formatPixelValue(rectangle.width)} × ${formatPixelValue(rectangle.height)}`;

		if (output.textContent !== nextText) output.textContent = nextText;
	}

	for (const output of document.querySelectorAll('[data-height-difference]')) {
		const [firstSelector, secondSelector] = output.dataset.heightDifference.split(' ');
		const firstTarget = document.querySelector(firstSelector);
		const secondTarget = document.querySelector(secondSelector);

		if (!firstTarget || !secondTarget) continue;

		const difference = Math.abs(
			firstTarget.getBoundingClientRect().height - secondTarget.getBoundingClientRect().height,
		);
		const hasDifference = difference > .5;
		const nextText = hasDifference
			? `Height differs by ${formatPixelValue(difference)}.`
			: 'Height matches within 0.5px.';

		output.dataset.hasDifference = hasDifference ? 'true' : 'false';
		if (output.textContent !== nextText) output.textContent = nextText;
	}
};

if (window.parent !== window) {
	const specimens = [...document.querySelectorAll('.specimen')];

	for (const [specimenIndex, specimen] of specimens.entries()) {
		if (!specimen.querySelector('[data-computed-for]')) continue;

		const specimenTitle = specimen.querySelector('.specimen__title')?.textContent.trim() || 'specimen';
		const inspectButton = document.createElement('button');
		inspectButton.className = 'specimen__inspect';
		inspectButton.type = 'button';
		inspectButton.textContent = 'Inspect';
		inspectButton.setAttribute('aria-label', `Inspect reset rules for ${specimenTitle}`);
		inspectButton.addEventListener('pointerdown', (event) => event.preventDefault());
		inspectButton.addEventListener('click', () => {
			window.parent.postMessage({
				type: 'inspect-specimen',
				specimenIndex,
			}, window.location.origin);
		});
		specimen.querySelector('.specimen__header')?.append(inspectButton);
	}
}

for (const openButton of document.querySelectorAll('[data-dialog-open]')) {
	openButton.addEventListener('click', () => {
		document.querySelector(`#${openButton.dataset.dialogOpen}`)?.showModal();
		requestAnimationFrame(notifyInspector);
	});
}

for (const closeButton of document.querySelectorAll('[data-dialog-close]')) {
	closeButton.addEventListener('click', () => {
		closeButton.closest('dialog')?.close();
		requestAnimationFrame(notifyInspector);
	});
}

const canvas = document.querySelector('#canvas-media');
const canvasContext = canvas.getContext('2d');

if (canvasContext) {
	const gradient = canvasContext.createLinearGradient(0, 0, canvas.width, canvas.height);
	gradient.addColorStop(0, '#2b6cb0');
	gradient.addColorStop(1, '#38a169');
	canvasContext.fillStyle = gradient;
	canvasContext.fillRect(0, 0, canvas.width, canvas.height);
	canvasContext.fillStyle = '#ffffff';
	canvasContext.font = '20px system-ui';
	canvasContext.textAlign = 'center';
	canvasContext.fillText('canvas 360 × 120', canvas.width / 2, 68);
}

reducedMotionPreference.addEventListener('change', () => {
	renderMode();
	notifyInspector();
});

document.addEventListener('input', (event) => {
	if (!event.target.matches('.date-time-probe')) return;

	requestAnimationFrame(renderDateTimeMeasurements);
});

window.addEventListener('message', (event) => {
	if (
		!hasReset
		|| event.source !== window.parent
		|| event.origin !== window.location.origin
		|| event.data?.type !== 'update-optional-styles'
	) return;

	hasControlsStyles = event.data.controls === true;
	hasReducedMotionStyles = event.data.motion === true;
	document.documentElement.dataset.controlsStyles = hasControlsStyles ? 'loaded' : 'omitted';
	document.documentElement.dataset.motionStyles = hasReducedMotionStyles ? 'loaded' : 'omitted';
	document.querySelector('#controls-reset').disabled = !hasControlsStyles;
	document.querySelector('#motion-reset').disabled = !hasReducedMotionStyles;

	const frameUrl = new URL(window.location.href);
	frameUrl.searchParams.set('controls', hasControlsStyles ? '1' : '0');
	frameUrl.searchParams.set('motion', hasReducedMotionStyles ? '1' : '0');
	window.history.replaceState(null, '', frameUrl);

	renderMode();
	requestAnimationFrame(notifyInspector);
});

new ResizeObserver(renderDateTimeMeasurements).observe(document.documentElement);
renderDateTimeMeasurements();
renderMode();
