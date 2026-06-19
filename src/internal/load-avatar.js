// Unified avatar loader + animation controller.
// ==============================================
// One entry point used by BOTH the corner companion and the full-page
// playground, so adding an avatar to the roster makes it work everywhere at
// once. Given a roster entry it loads the GLB and returns a controller with a
// single interface — setState('idle'|'walk'|'run'|'jump') + playWave() — no
// matter how the rig is animated underneath:
//
//   • embedded rigs play the clips baked into the GLB (robot, fox, showpieces),
//     with loose name matching that always falls back to the model's first clip
//     so even a one-animation GLB keeps moving and never shows a bind pose.
//   • shared rigs are driven by the retargeted shared clip library through
//     AnimationManager (humanoids that ship no locomotion, or only a T-pose).
//
// The caller is responsible for framing/scaling the returned `model`.

import { AnimationMixer, LoopOnce, LoopRepeat } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getMeshoptDecoder } from './meshopt.js';
import { AnimationManager } from './runtime.js';
import { log } from './log.js';
import { resolveAvatarUrl, DEFAULT_SHARED_CLIPS } from '../roster.js';

const DEFAULT_WAVE_MS = 1500;

let _loaderPromise = null;
async function makeLoader() {
	// One meshopt-only GLTFLoader, reused across loads. Draco/KTX2 are never
	// emitted by the bakes these avatars come from, so we skip those decoders.
	if (!_loaderPromise) {
		_loaderPromise = (async () => {
			const loader = new GLTFLoader();
			loader.setMeshoptDecoder(await getMeshoptDecoder());
			return loader;
		})();
	}
	return _loaderPromise;
}

/**
 * Load a roster entry and build its controller.
 * @returns {Promise<{ model: import('three').Object3D, controller: object, gltf: object }>}
 */
export async function loadWalkAvatar(entry, opts = {}) {
	const {
		assetBase = '',
		apiBase = '',
		manifestUrl = '/animations/manifest.json',
		fallbackEntry = null,
		waveMs = DEFAULT_WAVE_MS,
	} = opts;

	const loader = await makeLoader();
	const url = resolveAvatarUrl(entry, { assetBase, apiBase });
	if (!url) throw new Error(`walk: cannot resolve a GLB url for avatar "${entry?.id}"`);

	let active = entry;
	let gltf;
	try {
		gltf = await loader.loadAsync(url);
	} catch (err) {
		if (fallbackEntry && fallbackEntry.id !== entry.id) {
			log.warn(
				`avatar "${entry?.id}" failed to load — falling back to "${fallbackEntry.id}"`,
				err?.message || err,
			);
			active = fallbackEntry;
			gltf = await loader.loadAsync(resolveAvatarUrl(fallbackEntry, { assetBase, apiBase }));
		} else {
			throw err;
		}
	}

	const model = gltf.scene;
	model.traverse((n) => {
		if (n.isMesh) n.frustumCulled = false;
	});

	let controller;
	if (active.rig === 'shared') {
		controller = await buildSharedController(model, active.clips || DEFAULT_SHARED_CLIPS, {
			manifestUrl,
			waveMs,
		});
	} else {
		controller = makeEmbeddedController(model, gltf.animations || [], active.clips || {}, {
			waveMs,
		});
	}

	return { model, controller, gltf, entry: active };
}

// ── Embedded-clip controller (rig: 'embedded') ───────────────────────────────
function makeEmbeddedController(root, clips, overrides, { waveMs }) {
	const mixer = new AnimationMixer(root);
	const byName = (name) => clips.find((c) => c.name.toLowerCase() === String(name).toLowerCase());
	const pick = (cands) => {
		for (const n of cands) {
			const c = byName(n);
			if (c) return c;
		}
		return null;
	};
	const ov = (k) => (Array.isArray(overrides?.[k]) ? overrides[k] : []);

	// Idle must always resolve to *something* animated, so a single-clip GLB
	// (a lone walk or dance loop) never stalls in its bind/T-pose.
	const idleClip = pick([...ov('idle'), 'Idle', 'idle']) || clips[0] || null;
	const map = {
		idle: idleClip,
		walk: pick([...ov('walk'), 'Walking', 'Walk', 'walk']) || idleClip,
		run: pick([...ov('run'), 'Running', 'Run', 'run', 'Walking', 'walk']) || idleClip,
		jump: pick([...ov('jump'), 'Jump', 'jump', 'WalkJump']) || null,
		wave: pick([...ov('wave'), 'Wave', 'wave']) || null,
	};

	const action = {};
	for (const [state, clip] of Object.entries(map)) {
		if (!clip) continue;
		const a = mixer.clipAction(clip);
		a.enabled = true;
		action[state] = a;
	}

	let base = 'idle';
	let requested = 'idle';
	let current = null;
	let oneShot = false;

	function crossfade(name, { once = false, dur = 0.3 } = {}) {
		const a = action[name] || action.idle;
		if (!a) return;
		a.reset();
		a.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
		a.clampWhenFinished = once;
		a.fadeIn(dur).play();
		if (current && current !== a) current.fadeOut(dur);
		current = a;
	}

	mixer.addEventListener('finished', () => {
		if (oneShot) {
			oneShot = false;
			crossfade(base, { dur: 0.25 });
		}
	});

	crossfade('idle', { dur: 0 });

	return {
		setState(next) {
			if (next === requested) return;
			requested = next;
			if (next === 'jump') {
				if (action.jump) {
					oneShot = true;
					crossfade('jump', { once: true, dur: 0.12 });
				}
				return;
			}
			base = next;
			if (!oneShot) crossfade(base, { dur: 0.22 });
		},
		playWave() {
			if (!action.wave || oneShot) return;
			oneShot = true;
			crossfade('wave', { once: true, dur: 0.25 });
			// Safety net: if the 'finished' event is missed (clip stripped of its
			// end key, etc.), still fall back to the base after the clip's length.
			const len = action.wave.getClip().duration * 1000 || waveMs;
			clearTimeout(this._waveGuard);
			this._waveGuard = setTimeout(() => {
				if (oneShot) {
					oneShot = false;
					crossfade(base, { dur: 0.25 });
				}
			}, len + 250);
		},
		update(dt) {
			mixer.update(dt);
		},
		dispose() {
			clearTimeout(this._waveGuard);
			mixer.stopAllAction();
			mixer.uncacheRoot(root);
		},
	};
}

// ── Shared retargeted-clip controller (rig: 'shared') ────────────────────────
async function buildSharedController(model, clips, { manifestUrl, waveMs }) {
	const manager = new AnimationManager();
	manager.attach(model);

	const manifest = await fetch(manifestUrl, { cache: 'force-cache' }).then((r) => {
		if (!r.ok) throw new Error(`HTTP ${r.status} fetching animation manifest`);
		return r.json();
	});
	const available = new Set(manifest.map((d) => d.name));

	// Resolve each requested clip to one that actually exists; unknown names fall
	// back to idle so the controller never asks the manager for a missing clip.
	const resolved = {};
	for (const [state, name] of Object.entries({ ...DEFAULT_SHARED_CLIPS, ...clips })) {
		resolved[state] = available.has(name) ? name : null;
	}
	resolved.idle = resolved.idle || (available.has('idle') ? 'idle' : null);
	if (!resolved.idle) throw new Error('animation manifest missing an idle clip');
	for (const k of Object.keys(resolved)) if (!resolved[k]) resolved[k] = resolved.idle;

	const wanted = new Set(Object.values(resolved));
	manager.setAnimationDefs(manifest.filter((d) => wanted.has(d.name)));
	await manager.loadAll();

	let base = 'idle';
	let waveTimer = null;
	const fade = (name, dur) => Promise.resolve(manager.crossfadeTo(name, dur)).catch(() => {});
	const clipFor = (state) => resolved[state] || resolved.idle;
	fade(resolved.idle, 0);

	return {
		setState(next) {
			if (next === base) return;
			base = next;
			if (!waveTimer) fade(clipFor(next), next === 'jump' ? 0.12 : 0.3);
		},
		playWave() {
			if (waveTimer) return;
			const w = resolved.wave;
			if (!w || w === resolved.idle) return; // no distinct wave clip → skip
			fade(w, 0.25);
			waveTimer = setTimeout(() => {
				waveTimer = null;
				fade(clipFor(base), 0.3);
			}, waveMs);
		},
		update(dt) {
			manager.update(dt);
		},
		dispose() {
			clearTimeout(waveTimer);
			manager.dispose();
		},
	};
}
