/* global document */

const renderingProbeText = 'office affinity waffle offline efficient AVATAR LAYAWAY To Wa '
	.repeat(12)
	.trim();
const sourceParagraphs = [
	'Careful typography can improve the rhythm of a long article, but every shaping decision has a cost. Efficient offices, difficult files, flexible forms, and affirmative replies place common ligatures throughout this sample while punctuation and mixed sentence lengths keep the lines varied.',
	'On a quiet afternoon, the editorial team reviewed figures, captions, footnotes, and references. Each paragraph flowed through the same narrow measure, allowing line breaks, kerning pairs, and glyph choices to accumulate across a document that felt closer to a book than a small interface label.',
	'Readable text depends on more than one declaration. Typeface metrics, available glyphs, language, size, line height, and browser behavior all influence the result. This benchmark holds those inputs steady and changes only the requested text-rendering hint.',
	'Performance measurements are most useful when they are repeated. A single frame can include unrelated work from the browser, the operating system, or another tab. Alternating the order and reporting a median reduces noise without pretending that a synthetic page is a universal answer.',
	'The quick brown fox moved efficiently through fields of flowers before finding a quiet office near the river. Inside, a designer compared affine forms, official figures, flowing lines, and finely spaced letters under exactly the same layout constraints.',
	'Large documents amplify small costs. Hundreds of paragraphs require style resolution, font selection, shaping, line construction, and layout before the browser can present the next frame. The visible result may look identical even when the work behind it is not.',
	'Modern engines can cache fonts and repeated shaping work, so each measured pair receives fresh nodes and the same unique run identifier. This keeps the two modes comparable without reusing the exact text from earlier recorded runs.',
	'Typography is full of context. Letter pairs that look balanced at one size may feel crowded at another, and a feature that helps prose may be irrelevant to controls. Compare the timings here with the visual output, then profile the real page that matters.',
];

export const createCorpus = (
	paragraphCount,
	{ sampleId, shouldIncludeParagraphIdentifiers = true } = {},
) => {
	const corpus = document.createElement('div');
	const fragment = document.createDocumentFragment();

	corpus.className = 'text-corpus';
	if (sampleId) corpus.dataset.sampleId = sampleId;

	for (let index = 0; index < paragraphCount; index++) {
		const paragraph = document.createElement('p');
		const source = sourceParagraphs[index % sourceParagraphs.length];
		const identifier = sampleId ? `${sampleId}-${index + 1}` : index + 1;

		paragraph.textContent = shouldIncludeParagraphIdentifiers ? `${identifier}. ${source}` : source;
		fragment.append(paragraph);
	}

	corpus.append(fragment);
	return corpus;
};

export const createRenderingProbe = () => {
	const probe = document.createElement('span');

	probe.className = 'rendering-probe';
	probe.textContent = renderingProbeText;

	return probe;
};

export const loadBenchmarkFont = async () => {
	try {
		await document.fonts.load('1rem "Playfair Display"', 'office affinity waffle');
	} catch {
		// The system font stack remains a usable fallback when Google Fonts is unavailable.
	}

	await document.fonts.ready;
};
