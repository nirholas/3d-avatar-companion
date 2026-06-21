// Walk avatar picker — the panel where a visitor chooses who walks their pages.
// ============================================================================
// A self-contained, accessible popover: a searchable, category-grouped grid of
// the roster. It owns no 3D — selecting an avatar fires `onSelect(entry)` and
// the host (companion/playground) hot-swaps the live rig. Keyboard-navigable
// (arrows + Enter), closes on Escape or an outside click, and remembers nothing
// itself (persistence is the host's job).

import { isCoarsePointer } from './internal/storage.js';

let _stylesInjected = false;
function ensureStyles() {
	if (_stylesInjected || typeof document === 'undefined') return;
	_stylesInjected = true;
	const style = document.createElement('style');
	style.id = 'walk-picker-style';
	style.textContent = `
.walk-picker{position:fixed;z-index:2147483200;width:320px;max-width:calc(100vw - 24px);max-height:min(70vh,560px);display:flex;flex-direction:column;background:rgba(16,18,26,.97);color:#eef1f6;border:1px solid rgba(255,255,255,.12);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.5);backdrop-filter:blur(10px);opacity:0;transform:translateY(8px) scale(.98);transform-origin:bottom right;transition:opacity .2s ease,transform .2s ease;font:400 13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;overflow:hidden}
.walk-picker.is-in{opacity:1;transform:translateY(0) scale(1)}
.walk-picker-head{display:flex;align-items:center;gap:8px;padding:12px 12px 8px}
.walk-picker-title{font-weight:700;font-size:13.5px;letter-spacing:.01em}
.walk-picker-title small{display:block;font-weight:400;font-size:11px;color:#9aa3b2;margin-top:1px}
.walk-picker-close{margin-left:auto;width:26px;height:26px;border:none;border-radius:8px;background:rgba(255,255,255,.06);color:#cfd6e2;font-size:16px;line-height:1;cursor:pointer;display:grid;place-items:center;transition:background .15s ease}
.walk-picker-close:hover{background:rgba(255,255,255,.14)}
.walk-picker-close:focus-visible{outline:2px solid #7aa2ff;outline-offset:2px}
.walk-picker-search{margin:0 12px 8px;display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:7px 10px}
.walk-picker-search:focus-within{border-color:rgba(122,162,255,.7)}
.walk-picker-search input{flex:1;min-width:0;background:none;border:none;outline:none;color:#eef1f6;font:inherit}
.walk-picker-search input::placeholder{color:#7e8696}
.walk-picker-list{overflow-y:auto;padding:0 12px 12px;scrollbar-width:thin}
.walk-picker-cat{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7e8696;margin:12px 2px 7px}
.walk-picker-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.walk-picker-tile{position:relative;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:10px 6px 8px;cursor:pointer;background:rgba(255,255,255,.02);text-align:center;transition:transform .12s ease,border-color .15s ease,background .15s ease;color:inherit;font:inherit;display:flex;flex-direction:column;align-items:center;gap:5px;overflow:hidden}
.walk-picker-tile:hover{transform:translateY(-2px);background:rgba(255,255,255,.06)}
.walk-picker-tile:focus-visible{outline:2px solid #7aa2ff;outline-offset:1px}
.walk-picker-tile.is-active{border-color:var(--wp-accent,#7aa2ff);background:rgba(122,162,255,.12)}
.walk-picker-tile.is-active::after{content:'✓';position:absolute;top:5px;right:6px;font-size:11px;color:var(--wp-accent,#7aa2ff)}
.walk-picker-orb{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-size:22px;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.35),transparent 60%),var(--wp-accent,#7aa2ff);box-shadow:inset 0 -6px 12px rgba(0,0,0,.25);background-size:cover;background-position:center}
.walk-picker-name{font-size:11.5px;font-weight:600;line-height:1.1}
.walk-picker-empty{padding:24px 8px;text-align:center;color:#7e8696;font-size:12.5px}
.walk-picker-foot{padding:8px 12px;border-top:1px solid rgba(255,255,255,.08);font-size:11px;color:#7e8696;display:flex;justify-content:space-between;gap:8px}
.walk-picker-foot a{color:#9bb8ff;text-decoration:none}
.walk-picker-foot a:hover{text-decoration:underline}
@media (max-width:520px){.walk-picker{width:calc(100vw - 24px)}.walk-picker-grid{grid-template-columns:repeat(4,1fr)}}
@media (prefers-reduced-motion:reduce){.walk-picker,.walk-picker-tile{transition:none}}
`;
	document.head.appendChild(style);
}

/**
 * @param {object} opts
 * @param {Array} opts.avatars roster entries to show
 * @param {string|null} opts.currentId currently selected avatar id
 * @param {(entry:object)=>void} opts.onSelect called with the chosen entry
 * @param {{right:number,bottom:number}} [opts.anchor] viewport anchor (px from edges)
 * @param {string} [opts.assetBase] base for thumbnail urls
 * @param {string} [opts.docsUrl] optional "make your own" link
 */
export function createAvatarPicker(opts) {
	ensureStyles();
	const {
		avatars = [],
		onSelect,
		anchor = { right: 16, bottom: 16 },
		assetBase = '',
		docsUrl,
	} = opts;
	let currentId = opts.currentId || null;
	let query = '';

	const root = document.createElement('div');
	root.className = 'walk-picker';
	root.setAttribute('role', 'dialog');
	root.setAttribute('aria-label', 'Choose your walking avatar');
	root.style.right = `${anchor.right}px`;
	root.style.bottom = `${anchor.bottom}px`;

	root.innerHTML = `
		<div class="walk-picker-head">
			<div class="walk-picker-title">Walking avatar<small>Pick who roams your pages</small></div>
			<button type="button" class="walk-picker-close" aria-label="Close avatar picker">×</button>
		</div>
		<label class="walk-picker-search">
			<span aria-hidden="true">🔍</span>
			<input type="search" placeholder="Search avatars…" aria-label="Search avatars" />
		</label>
		<div class="walk-picker-list" role="listbox" aria-label="Avatars"></div>
		${docsUrl ? `<div class="walk-picker-foot"><span>${avatars.length} avatars</span><a href="${docsUrl}">Make your own →</a></div>` : ''}
	`;

	const listEl = root.querySelector('.walk-picker-list');
	const inputEl = root.querySelector('.walk-picker-search input');
	const closeBtn = root.querySelector('.walk-picker-close');

	function tileFor(entry) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'walk-picker-tile' + (entry.id === currentId ? ' is-active' : '');
		btn.setAttribute('role', 'option');
		btn.setAttribute('aria-selected', String(entry.id === currentId));
		btn.dataset.id = entry.id;
		btn.title = entry.blurb || entry.name;
		if (entry.accent) btn.style.setProperty('--wp-accent', entry.accent);
		const orbStyle = entry.thumb
			? ` style="background-image:url('${assetBase}${entry.thumb}')"`
			: '';
		btn.innerHTML = `<span class="walk-picker-orb"${orbStyle}>${entry.thumb ? '' : entry.emoji || '🧍'}</span>`;
		const nameSpan = document.createElement('span');
		nameSpan.className = 'walk-picker-name';
		nameSpan.textContent = entry.name;
		btn.appendChild(nameSpan);
		btn.addEventListener('click', () => choose(entry));
		return btn;
	}

	function render() {
		const q = query.trim().toLowerCase();
		const matches = avatars.filter((a) => {
			if (!q) return true;
			return (
				a.name.toLowerCase().includes(q) ||
				a.category.toLowerCase().includes(q) ||
				(a.tags || []).some((t) => t.includes(q))
			);
		});
		listEl.innerHTML = '';
		if (!matches.length) {
			const empty = document.createElement('div');
			empty.className = 'walk-picker-empty';
			empty.textContent = `No avatars match “${query}”.`;
			listEl.appendChild(empty);
			return;
		}
		const cats = [];
		for (const a of matches) if (!cats.includes(a.category)) cats.push(a.category);
		for (const cat of cats) {
			const h = document.createElement('div');
			h.className = 'walk-picker-cat';
			h.textContent = cat;
			listEl.appendChild(h);
			const grid = document.createElement('div');
			grid.className = 'walk-picker-grid';
			for (const a of matches.filter((m) => m.category === cat)) grid.appendChild(tileFor(a));
			listEl.appendChild(grid);
		}
	}

	function choose(entry) {
		currentId = entry.id;
		render();
		onSelect?.(entry);
		close();
	}

	// ── Open / close lifecycle ────────────────────────────────────────────────
	let open = false;
	const onDocPointer = (e) => {
		if (!root.contains(e.target) && !e.target.closest?.('[data-walk-picker-toggle]')) close();
	};
	const onKey = (e) => {
		if (e.key === 'Escape') {
			e.stopPropagation();
			close();
			return;
		}
		const tiles = [...listEl.querySelectorAll('.walk-picker-tile')];
		const i = tiles.indexOf(document.activeElement);
		if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key) && tiles.length) {
			e.preventDefault();
			const cols = matchMedia('(max-width:520px)').matches ? 4 : 3;
			let next = i;
			if (e.key === 'ArrowRight') next = i + 1;
			else if (e.key === 'ArrowLeft') next = i - 1;
			else if (e.key === 'ArrowDown') next = i + cols;
			else if (e.key === 'ArrowUp') next = i - cols;
			next = Math.max(0, Math.min(tiles.length - 1, next));
			tiles[next]?.focus();
		}
	};

	inputEl.addEventListener('input', () => {
		query = inputEl.value;
		render();
	});
	closeBtn.addEventListener('click', close);
	root.addEventListener('keydown', onKey);

	function show() {
		if (open) return;
		open = true;
		render();
		document.body.appendChild(root);
		requestAnimationFrame(() => {
			root.classList.add('is-in');
			// Focus search on desktop; avoid popping the keyboard on touch.
			if (!isCoarsePointer()) inputEl.focus();
		});
		setTimeout(() => document.addEventListener('pointerdown', onDocPointer, true), 0);
	}

	function close() {
		if (!open) return;
		open = false;
		root.classList.remove('is-in');
		document.removeEventListener('pointerdown', onDocPointer, true);
		setTimeout(() => {
			if (!open && root.parentNode) root.parentNode.removeChild(root);
		}, 200);
	}

	function destroy() {
		close();
		root.removeEventListener('keydown', onKey);
	}

	return {
		el: root,
		show,
		close,
		toggle() {
			open ? close() : show();
		},
		isOpen: () => open,
		setCurrent(id) {
			currentId = id;
			if (open) render();
		},
		destroy,
	};
}
