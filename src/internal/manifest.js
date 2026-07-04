/**
 * @three-ws/walk — animation-manifest URL resolution.
 * ====================================================
 * The shared animation manifest lists clip URLs as root-relative paths
 * (`/animations/clips/idle.json`) because that matches the three.ws asset
 * layout. When a host page on another origin points `manifestUrl` at a CDN
 * (e.g. `https://three.ws/animations/manifest.json`), those paths must be
 * resolved against the MANIFEST's origin — not the host page's — or every
 * clip fetch 404s on the host domain and shared-rig avatars lose locomotion.
 *
 * Pure logic so `node --test` can cover it without touching the DOM.
 */

/**
 * Resolve each clip def's `url` against the manifest's own URL, so relative
 * clip paths always load from wherever the manifest itself was served.
 *
 * @param {Array<{name:string, url?:string}>} defs  parsed manifest entries
 * @param {string} manifestUrl  the URL the manifest was fetched from (may be
 *   relative — it is resolved against `baseHref` first)
 * @param {string} [baseHref]  document base; defaults to `location.href`
 * @returns {Array} defs with absolute clip URLs (entries without a url pass through)
 */
export function resolveClipUrls(defs, manifestUrl, baseHref) {
	const base = new URL(
		manifestUrl,
		baseHref || (typeof location !== 'undefined' ? location.href : 'http://localhost/'),
	);
	return defs.map((d) => (d && typeof d.url === 'string' ? { ...d, url: new URL(d.url, base).href } : d));
}
