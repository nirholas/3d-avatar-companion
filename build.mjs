#!/usr/bin/env node
// Build @three-ws/walk into a self-contained, publishable ES module.
// ==================================================================
// The source reaches back into the monorepo for the shared retargeting engine
// (see src/internal/runtime.js). esbuild bundles that — and everything else
// except `three` — into dist/, so npm consumers install one standalone package
// that only needs their own copy of Three.js (the peer dependency).
//
// `splitting` is on, so companion.js's dynamic import('./playground.js')
// resolves to its own chunk and the playground never RUNS on a page that only
// shows the corner companion. The playground's code still lands in the shared
// chunk rather than a deferred one, because src/index.js also re-exports the
// playground API at the top level; that static edge makes esbuild hoist the
// module out of the dynamic chunk. Deferring the download too would mean moving
// those exports to a "./playground" subpath, a breaking change to the public
// API documented in README.md, so it is deliberately not done here.

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
