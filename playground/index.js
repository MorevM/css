/* global document, requestAnimationFrame, window */

const nativeFrame = document.querySelector('#native-frame');
const resetFrame = document.querySelector('#reset-frame');
const resetFrameLink = document.querySelector('#reset-frame-link');
const motionToggle = document.querySelector('#motion-toggle');
const syncToggle = document.querySelector('#sync-toggle');
const scrollReset = document.querySelector('#scroll-reset');
const inspector = document.querySelector('#inspector');
const inspectorTitle = document.querySelector('#inspector-title');
const inspectorContent = document.querySelector('#inspector-content');
const showUnchangedToggle = document.querySelector('#show-unchanged-toggle');
const closeInspector = document.querySelector('#close-inspector');
const comparisonPaneHeaders = [...document.querySelectorAll('.comparison-pane__header')];
const splitViewMedia = window.matchMedia('(width >= 44rem)');
const alignedElementSelectors = [
	'.frame-header',
	'.jump-navigation',
	'.showcase-section__header',
	'.showcase-section > article',
];
const alignedSectionSelector = '.showcase-section';

let isSynchronizingScroll = false;
let alignmentFrameId;
let inspectedSpecimenIndex;

const synchronizeScroll = (sourceFrame, targetFrame) => {
	if (!syncToggle.checked || isSynchronizingScroll) return;

	const sourceWindow = sourceFrame.contentWindow;
	const targetWindow = targetFrame.contentWindow;

	if (!sourceWindow || !targetWindow) return;

	const sourceDocument = sourceWindow.document.documentElement;
	const targetDocument = targetWindow.document.documentElement;
	const sourceRange = sourceDocument.scrollHeight - sourceWindow.innerHeight;
	const targetRange = targetDocument.scrollHeight - targetWindow.innerHeight;

	if (sourceRange <= 0 || targetRange <= 0) return;

	isSynchronizingScroll = true;
	targetWindow.scrollTo({
		top: sourceWindow.scrollY / sourceRange * targetRange,
		behavior: 'instant',
	});

	requestAnimationFrame(() => {
		isSynchronizingScroll = false;
	});
};

const getFrameElements = (frame, selector) => {
	return [...(frame.contentDocument?.querySelectorAll(selector) || [])];
};

const splitSelectorList = (selectorText) => {
	const selectors = [];
	let selectorStart = 0;
	let nestingDepth = 0;
	let quote;

	for (let index = 0; index < selectorText.length; index++) {
		const character = selectorText[index];

		if (quote) {
			if (character === '\\') index++;
			else if (character === quote) quote = undefined;
			continue;
		}

		if (character === '"' || character === "'") quote = character;
		else if (character === '(' || character === '[') nestingDepth++;
		else if (character === ')' || character === ']') nestingDepth--;
		else if (character === ',' && nestingDepth === 0) {
			selectors.push(selectorText.slice(selectorStart, index).trim());
			selectorStart = index + 1;
		}
	}

	selectors.push(selectorText.slice(selectorStart).trim());
	return selectors.filter(Boolean);
};

const resolveNestedSelector = (selectorText, parentSelectorText) => {
	if (!parentSelectorText || !selectorText.includes('&')) return selectorText;

	return selectorText.replaceAll('&', () => `:is(${parentSelectorText})`);
};

const getPseudoElementIndex = (selector) => {
	let nestingDepth = 0;
	let quote;

	for (let index = 0; index < selector.length - 1; index++) {
		const character = selector[index];

		if (quote) {
			if (character === '\\') index++;
			else if (character === quote) quote = undefined;
			continue;
		}

		if (character === '"' || character === "'") quote = character;
		else if (character === '(' || character === '[') nestingDepth++;
		else if (character === ')' || character === ']') nestingDepth--;
		else if (character === ':' && selector[index + 1] === ':' && nestingDepth === 0) return index;
	}

	return -1;
};

const matchesResetSelector = (target, selectorText, pseudoElement) => {
	return splitSelectorList(selectorText).some((selector) => {
		const pseudoIndex = getPseudoElementIndex(selector);
		const selectorPseudo = pseudoIndex === -1 ? null : selector.slice(pseudoIndex).trim();

		if (selectorPseudo !== pseudoElement) return false;

		const elementSelector = pseudoIndex === -1 ? selector : selector.slice(0, pseudoIndex).trim() || '*';

		try {
			return target.matches(elementSelector);
		} catch {
			return false;
		}
	});
};

const isRuleConditionActive = (rule, frameWindow) => {
	if (rule.constructor.name === 'CSSMediaRule') {
		return frameWindow.matchMedia(rule.conditionText).matches;
	}

	if (rule.constructor.name === 'CSSSupportsRule') {
		return frameWindow.CSS.supports(rule.conditionText);
	}

	return true;
};

const getPropertyDeclaration = (style, property) => {
	const propertyValue = style.getPropertyValue(property).trim();
	const allValue = style.getPropertyValue('all').trim();
	const canUseAll = property !== 'direction' && property !== 'unicode-bidi' && !property.startsWith('--');

	if (!propertyValue && (!allValue || !canUseAll)) return;

	const isFromAll = canUseAll && Boolean(allValue) && (!propertyValue || propertyValue === allValue);
	const declarationProperty = isFromAll ? 'all' : property;

	return {
		value: propertyValue || allValue,
		priority: style.getPropertyPriority(declarationProperty),
		declarationProperty,
	};
};

const shouldReplaceDeclaration = (currentDeclaration, nextDeclaration) => {
	if (!currentDeclaration) return true;
	if (currentDeclaration.priority !== 'important') return true;
	return nextDeclaration.priority === 'important';
};

const collectResetDeclarations = ({
	rules,
	target,
	pseudoElement,
	properties,
	frameWindow,
	parentSelectorText,
	isParentMatch = false,
	result,
}) => {
	for (const rule of rules) {
		if (!isRuleConditionActive(rule, frameWindow)) continue;

		const selectorText = typeof rule.selectorText === 'string'
			? resolveNestedSelector(rule.selectorText, parentSelectorText)
			: parentSelectorText;
		const isMatch = typeof rule.selectorText === 'string'
			? matchesResetSelector(target, selectorText, pseudoElement)
			: isParentMatch;

		if (isMatch && rule.style?.cssText) {
			for (const property of properties) {
				const declaration = getPropertyDeclaration(rule.style, property);

				if (declaration && shouldReplaceDeclaration(result.get(property), declaration)) {
					result.set(property, {
						...declaration,
					});
				}
			}
		}

		if (rule.cssRules?.length) {
			collectResetDeclarations({
				rules: rule.cssRules,
				target,
				pseudoElement,
				properties,
				frameWindow,
				parentSelectorText: selectorText,
				isParentMatch: isMatch,
				result,
			});
		}
	}
};

const getResetDeclarations = (target, pseudoElement, properties) => {
	const frameDocument = resetFrame.contentDocument;
	const frameWindow = resetFrame.contentWindow;
	const result = new Map();

	for (const stylesheetLink of frameDocument.querySelectorAll('link[rel="stylesheet"][id$="-reset"]')) {
		if (stylesheetLink.disabled || !stylesheetLink.sheet) continue;

		collectResetDeclarations({
			rules: stylesheetLink.sheet.cssRules,
			target,
			pseudoElement,
			properties,
			frameWindow,
			result,
		});
	}

	return result;
};

const getInspectorConfigurations = (specimen) => {
	const configurations = new Map();

	for (const element of specimen.querySelectorAll('[data-computed-for]')) {
		const selector = element.dataset.computedFor;
		const pseudoElement = element.dataset.pseudo || null;
		const key = `${selector}\n${pseudoElement || ''}`;

		if (configurations.has(key)) continue;

		configurations.set(key, {
			selector,
			pseudoElement,
			properties: element.dataset.properties.split(',').map((property) => property.trim()),
		});
	}

	return [...configurations.values()];
};

const appendEmptyMessage = (message) => {
	const emptyMessage = document.createElement('p');
	emptyMessage.className = 'inspector__empty';
	emptyMessage.textContent = message;
	inspectorContent.append(emptyMessage);
};

const appendInspectorGroup = (targetLabel, rows) => {
	const group = document.createElement('section');
	const target = document.createElement('h3');
	const table = document.createElement('table');
	const tableHead = document.createElement('thead');
	const headingRow = document.createElement('tr');
	const tableBody = document.createElement('tbody');

	group.className = 'inspector__group';
	target.className = 'inspector__target';
	target.textContent = targetLabel;
	table.className = 'inspector__table';

	for (const [heading, className] of [
		['Property', 'inspector__property'],
		['Reset declaration', ''],
		['Final resolved', ''],
	]) {
		const headingCell = document.createElement('th');
		headingCell.className = className;
		headingCell.scope = 'col';
		headingCell.textContent = heading;
		headingRow.append(headingCell);
	}

	for (const row of rows) {
		const tableRow = document.createElement('tr');
		const propertyCell = document.createElement('td');
		const declarationCell = document.createElement('td');
		const resetValueCell = document.createElement('td');
		const declarationValue = document.createElement('span');
		const declarationMeta = document.createElement('span');
		const resetValue = document.createElement('span');
		const nativeValue = document.createElement('span');

		propertyCell.className = 'inspector__property';
		propertyCell.textContent = row.property;
		declarationValue.className = 'inspector__value';
		declarationMeta.className = 'inspector__meta';
		resetValue.className = 'inspector__value';
		resetValue.textContent = row.resetValue;
		nativeValue.className = 'inspector__meta';
		nativeValue.textContent = `Without reset: ${row.nativeValue}`;

		if (row.declaration) {
			declarationValue.textContent = `${row.declaration.value}${row.declaration.priority ? ' !important' : ''}`;
			declarationMeta.textContent = row.declaration.declarationProperty === 'all' ? 'via all' : '';
			declarationCell.append(declarationValue);

			if (declarationMeta.textContent) declarationCell.append(declarationMeta);
		} else {
			declarationValue.textContent = '—';
			declarationMeta.textContent = 'No direct reset declaration';
			declarationCell.append(declarationValue, declarationMeta);
		}

		resetValueCell.append(resetValue, nativeValue);

		if (row.isChanged) resetValueCell.className = 'inspector__value--changed';

		tableRow.append(propertyCell, declarationCell, resetValueCell);
		tableBody.append(tableRow);
	}

	tableHead.append(headingRow);
	table.append(tableHead, tableBody);
	group.append(target, table);
	inspectorContent.append(group);
};

const renderInspectorContent = (resetSpecimen) => {
	const configurations = getInspectorConfigurations(resetSpecimen);
	const note = document.createElement('p');
	let visibleGroupCount = 0;

	note.className = 'inspector__note';
	note.textContent = 'Reset declarations come from active reset stylesheets. Resolved values include inheritance and playground styles.';
	inspectorContent.append(note);

	for (const configuration of configurations) {
		const nativeDocument = nativeFrame.contentDocument;
		const resetDocument = resetFrame.contentDocument;
		const nativeTarget = configuration.selector === ':root'
			? nativeDocument.documentElement
			: nativeDocument.querySelector(configuration.selector);
		const resetTarget = configuration.selector === ':root'
			? resetDocument.documentElement
			: resetDocument.querySelector(configuration.selector);
		const rows = [];

		if (!nativeTarget || !resetTarget) {
			rows.push({
				property: 'Target',
				nativeValue: nativeTarget ? 'Found' : 'Not found',
				resetValue: resetTarget ? 'Found' : 'Not found',
				isChanged: nativeTarget !== resetTarget,
			});
		} else {
			const declarations = getResetDeclarations(
				resetTarget,
				configuration.pseudoElement,
				configuration.properties,
			);
			const nativeStyle = nativeFrame.contentWindow.getComputedStyle(nativeTarget, configuration.pseudoElement);
			const resetStyle = resetFrame.contentWindow.getComputedStyle(resetTarget, configuration.pseudoElement);

			for (const property of configuration.properties) {
				const nativeValue = nativeStyle.getPropertyValue(property).trim() || '—';
				const resetValue = resetStyle.getPropertyValue(property).trim() || '—';
				const isChanged = nativeValue !== resetValue;

				if (showUnchangedToggle.checked || isChanged) {
					rows.push({
						property,
						declaration: declarations.get(property),
						nativeValue,
						resetValue,
						isChanged,
					});
				}
			}
		}

		if (rows.length === 0) continue;

		appendInspectorGroup(`${configuration.selector}${configuration.pseudoElement || ''}`, rows);
		visibleGroupCount++;
	}

	if (visibleGroupCount === 0) {
		appendEmptyMessage(showUnchangedToggle.checked
			? 'No tracked properties are available.'
			: 'No tracked resolved values differ. Enable “Show unchanged” to inspect all configured properties.');
	}
};

const renderInspector = () => {
	if (inspectedSpecimenIndex === undefined || inspector.hidden) return;

	const nativeSpecimen = getFrameElements(nativeFrame, '.specimen')[inspectedSpecimenIndex];
	const resetSpecimen = getFrameElements(resetFrame, '.specimen')[inspectedSpecimenIndex];
	inspectorContent.replaceChildren();

	if (!nativeSpecimen || !resetSpecimen) {
		appendEmptyMessage('The comparison frames are still loading.');
		return;
	}

	inspectorTitle.textContent = resetSpecimen.querySelector('.specimen__title')?.textContent.trim() || 'Specimen';
	renderInspectorContent(resetSpecimen);
};

const hideInspector = () => {
	inspector.hidden = true;
	inspectedSpecimenIndex = undefined;
};

const clearAlignment = () => {
	const selectors = [...alignedElementSelectors, alignedSectionSelector];

	for (const header of comparisonPaneHeaders) {
		header.style.minBlockSize = '';
	}

	for (const selector of selectors) {
		for (const frame of [nativeFrame, resetFrame]) {
			for (const element of getFrameElements(frame, selector)) {
				element.style.minBlockSize = '';
			}
		}
	}
};

const alignComparisonPaneHeaders = () => {
	const blockSize = Math.max(...comparisonPaneHeaders.map((header) => header.getBoundingClientRect().height));

	for (const header of comparisonPaneHeaders) {
		header.style.minBlockSize = `${blockSize}px`;
	}
};

const setOuterMinBlockSize = (element, outerBlockSize) => {
	const computedStyle = element.ownerDocument.defaultView.getComputedStyle(element);
	const contentBoxExtras = [
		'padding-block-start',
		'padding-block-end',
		'border-block-start-width',
		'border-block-end-width',
	].reduce((sum, property) => sum + (Number.parseFloat(computedStyle.getPropertyValue(property)) || 0), 0);
	const blockSize = computedStyle.boxSizing === 'border-box'
		? outerBlockSize
		: outerBlockSize - contentBoxExtras;

	element.style.minBlockSize = `${Math.max(0, blockSize)}px`;
};

const alignElementPairs = (selector) => {
	const nativeElements = getFrameElements(nativeFrame, selector);
	const resetElements = getFrameElements(resetFrame, selector);
	const pairCount = Math.min(nativeElements.length, resetElements.length);

	for (let index = 0; index < pairCount; index++) {
		const nativeElement = nativeElements[index];
		const resetElement = resetElements[index];
		const blockSize = Math.max(
			nativeElement.getBoundingClientRect().height,
			resetElement.getBoundingClientRect().height,
		);

		setOuterMinBlockSize(nativeElement, blockSize);
		setOuterMinBlockSize(resetElement, blockSize);
	}
};

const alignSplitView = () => {
	clearAlignment();

	if (!splitViewMedia.matches) return;

	alignComparisonPaneHeaders();

	for (const selector of alignedElementSelectors) {
		alignElementPairs(selector);
	}

	alignElementPairs(alignedSectionSelector);
};

const scheduleAlignment = () => {
	if (alignmentFrameId) return;

	alignmentFrameId = requestAnimationFrame(() => {
		alignmentFrameId = requestAnimationFrame(() => {
			alignmentFrameId = undefined;
			alignSplitView();
		});
	});
};

const wireScrollSynchronization = () => {
	if (nativeFrame.contentWindow) {
		nativeFrame.contentWindow.onscroll = () => synchronizeScroll(nativeFrame, resetFrame);
	}

	if (resetFrame.contentWindow) {
		resetFrame.contentWindow.onscroll = () => synchronizeScroll(resetFrame, nativeFrame);
	}
};

const updateOptionalStyles = () => {
	const hasReducedMotionStyles = motionToggle.checked;
	const resetFrameUrl = [
		'./frame.html?mode=reset',
		`motion=${hasReducedMotionStyles ? '1' : '0'}`,
	].join('&');

	resetFrameLink.href = resetFrameUrl;
	resetFrame.contentWindow?.postMessage({
		type: 'update-optional-styles',
		motion: hasReducedMotionStyles,
	}, window.location.origin);
};

const handleFrameLoad = ({ currentTarget }) => {
	wireScrollSynchronization();
	scheduleAlignment();

	if (currentTarget === resetFrame) updateOptionalStyles();
	if (inspectedSpecimenIndex !== undefined) requestAnimationFrame(renderInspector);
};

window.addEventListener('message', (event) => {
	const isKnownFrame = event.source === nativeFrame.contentWindow || event.source === resetFrame.contentWindow;

	if (event.origin !== window.location.origin || !isKnownFrame) return;

	if (event.data?.type === 'inspect-specimen' && Number.isSafeInteger(event.data.specimenIndex)) {
		inspectedSpecimenIndex = event.data.specimenIndex;
		inspector.hidden = false;
		renderInspector();
	}

	if (event.data?.type === 'inspector-state-changed') renderInspector();
});

nativeFrame.addEventListener('load', handleFrameLoad);
resetFrame.addEventListener('load', handleFrameLoad);
window.addEventListener('load', () => {
	updateOptionalStyles();
	scheduleAlignment();
});
window.addEventListener('resize', scheduleAlignment);

motionToggle.addEventListener('change', updateOptionalStyles);
showUnchangedToggle.addEventListener('change', renderInspector);
closeInspector.addEventListener('click', hideInspector);

window.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !inspector.hidden) hideInspector();
});

scrollReset.addEventListener('click', () => {
	nativeFrame.contentWindow?.scrollTo({ top: 0, behavior: 'instant' });
	resetFrame.contentWindow?.scrollTo({ top: 0, behavior: 'instant' });
});
