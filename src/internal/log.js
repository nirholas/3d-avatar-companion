/* eslint-disable no-console -- this module IS the console wrapper */
// Minimal namespaced logger. Quiet by default; set `window.__walkDebug = true`
// (or localStorage `walk:debug` = '1') to surface info/debug lines. Warnings
// and errors always pass through so failures are never swallowed silently.

function debugOn() {
	if (typeof window === 'undefined') return false;
	if (window.__walkDebug) return true;
	try {
		return window.localStorage?.getItem('walk:debug') === '1';
	} catch {
		return false;
	}
}

export const log = {
	debug(...args) {
		if (debugOn()) console.debug('[walk]', ...args);
	},
	info(...args) {
		if (debugOn()) console.info('[walk]', ...args);
	},
	warn(...args) {
		console.warn('[walk]', ...args);
	},
	error(...args) {
		console.error('[walk]', ...args);
	},
};
