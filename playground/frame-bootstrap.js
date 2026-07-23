/* global document, window */

const searchParameters = new URLSearchParams(window.location.search);
const hasReset = searchParameters.get('mode') === 'reset';
const hasControlsStyles = hasReset && searchParameters.get('controls') === '1';
const hasReducedMotionStyles = hasReset && searchParameters.get('motion') === '1';

document.documentElement.dataset.mode = hasReset ? 'reset' : 'native';
document.documentElement.dataset.controlsStyles = hasControlsStyles ? 'loaded' : 'omitted';
document.documentElement.dataset.motionStyles = hasReducedMotionStyles ? 'loaded' : 'omitted';
document.querySelector('#core-reset').disabled = !hasReset;
document.querySelector('#base-reset').disabled = !hasReset;
document.querySelector('#controls-reset').disabled = !hasControlsStyles;
document.querySelector('#motion-reset').disabled = !hasReducedMotionStyles;
