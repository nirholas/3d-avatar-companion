// @three-ws/walk — manifest clip-URL resolution.
// ===============================================
// Clip URLs in the shared animation manifest are root-relative. When the
// manifest is served from another origin (a host site pointing at the
// three.ws CDN), each clip must resolve against the MANIFEST's origin, not
// the host page's — otherwise every clip fetch 404s on the host domain.
// Pure logic; `node --test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveClipUrls } from '../src/internal/manifest.js';

const HOST = 'https://example-store.myshopify.com/products/mug';

test('root-relative clip urls resolve against a cross-origin manifest', () => {
	const out = resolveClipUrls(
		[{ name: 'idle', url: '/animations/clips/idle.json' }],
		'https://three.ws/animations/manifest.json',
		HOST,
	);
	assert.equal(out[0].url, 'https://three.ws/animations/clips/idle.json');
});

test('same-origin relative manifestUrl keeps clips on the host origin', () => {
	const out = resolveClipUrls(
		[{ name: 'idle', url: '/animations/clips/idle.json' }],
		'/animations/manifest.json',
		HOST,
	);
	assert.equal(out[0].url, 'https://example-store.myshopify.com/animations/clips/idle.json');
});

test('document-relative clip urls resolve against the manifest directory', () => {
	const out = resolveClipUrls(
		[{ name: 'walk', url: 'clips/walk.json' }],
		'https://cdn.example.com/anim/manifest.json',
		HOST,
	);
	assert.equal(out[0].url, 'https://cdn.example.com/anim/clips/walk.json');
});

test('already-absolute clip urls pass through untouched', () => {
	const abs = 'https://assets.example.com/idle.json';
	const out = resolveClipUrls(
		[{ name: 'idle', url: abs }],
		'https://three.ws/animations/manifest.json',
		HOST,
	);
	assert.equal(out[0].url, abs);
});

test('entries without a url and non-url metadata pass through unchanged', () => {
	const defs = [
		{ name: 'idle', url: '/animations/clips/idle.json', label: 'Idle', icon: '🧍', loop: true },
		{ name: 'meta-only' },
	];
	const out = resolveClipUrls(defs, 'https://three.ws/animations/manifest.json', HOST);
	assert.equal(out[0].label, 'Idle');
	assert.equal(out[0].icon, '🧍');
	assert.equal(out[0].loop, true);
	assert.deepEqual(out[1], { name: 'meta-only' });
	// input defs are not mutated
	assert.equal(defs[0].url, '/animations/clips/idle.json');
});
