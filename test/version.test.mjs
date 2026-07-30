// The exported VERSION constant is the only version consumers can read at
// runtime, and it silently drifted from package.json (0.1.0 vs 0.1.2) because
// nothing checked it. This test is that check.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { VERSION } from '../src/index.js';

const pkg = JSON.parse(
	readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
);

test('the exported VERSION matches package.json', () => {
	assert.equal(VERSION, pkg.version);
});

test('package.json declares every path it exports and ships', () => {
	const declared = new Set(['./types/index.d.ts']);
	for (const entry of Object.values(pkg.exports)) {
		if (typeof entry === 'string') declared.add(entry);
		else for (const target of Object.values(entry)) declared.add(target);
	}
	// Everything an export points at must sit under a directory listed in "files",
	// or an `npm install` of the tarball resolves to a missing file.
	const shipped = new Set(pkg.files);
	for (const target of declared) {
		const top = target.replace(/^\.\//, '').split('/')[0];
		assert.ok(shipped.has(top), `exports target ${target} is not covered by "files"`);
	}
});
