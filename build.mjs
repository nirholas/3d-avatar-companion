#!/usr/bin/env node
// Build @three-ws/walk into a self-contained, publishable ES module.
// ==================================================================
// The source reaches back into the monorepo for the shared retargeting engine
// (see src/internal/runtime.js). esbuild bundles that — and everything else
// except `three` — into dist/, so npm consumers install one standalone package
// that only needs their own copy of Three.js (the peer dependency).
//
// Dynamic import('./playground.js') stays a separate chunk (code-splitting) so
// pages that only use the corner companion never download the playground.

import { build } from 'esbuild';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'dist');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const result = await build({
	entryPoints: [resolve(here, 'src/index.js')],
	outdir: outDir,
	bundle: true,
	format: 'esm',
	splitting: true,
	platform: 'browser',
	target: 'es2020',
	// Three.js and its addons are the peer dependency — never inline them.
	external: ['three', 'three/addons/*'],
	outExtension: { '.js': '.mjs' },
	entryNames: '[name]',
	chunkNames: 'chunk-[name]-[hash]',
	legalComments: 'none',
	metafile: true,
	logLevel: 'info',
});

// Styles are injected at runtime by each module, so the ".css" subpath is a
// no-op kept for forward-compatibility with side-effect `import` of the stylesheet.
writeFileSync(
	resolve(outDir, 'style.css'),
	'/* @three-ws/walk — styles are injected at runtime by the companion, playground, and picker. */\n',
);

const out = Object.keys(result.metafile.outputs)
	.map((p) => p.replace(/^.*walk-sdk\//, ''))
	.sort();
console.log('[walk-sdk] built:\n  ' + out.join('\n  '));
