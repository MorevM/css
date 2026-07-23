/* global document, window */

const searchParameters = new URLSearchParams(window.location.search);
const hasReset = searchParameters.get('mode') === 'reset';

document.documentElement.dataset.mode = hasReset ? 'reset' : 'native';
document.querySelector('#core-reset').disabled = !hasReset;
document.querySelector('#base-reset').disabled = !hasReset;
document.querySelector('#motion-reset').disabled = !hasReset;
