// Type definitions for @three-ws/walk
import type { Object3D } from 'three';

export declare const VERSION: string;

/** How a roster avatar is animated. */
export type WalkRig = 'embedded' | 'shared';

/** Logical animation states the controller understands. */
export type WalkState = 'idle' | 'walk' | 'run' | 'jump';

/** Mapping of logical states to clip names (shared rig) or candidate name lists (embedded rig). */
export interface WalkClipMap {
	idle?: string | string[];
	walk?: string | string[];
	run?: string | string[];
	wave?: string | string[];
	jump?: string | string[];
}

/** A single avatar in the roster. */
export interface WalkAvatar {
	id: string;
	name: string;
	emoji?: string;
	blurb?: string;
	category: string;
	/** GLB path resolved against `assetBase`; null for API-served avatars. */
	asset: string | null;
	source: 'static' | 'api';
	rig: WalkRig;
	clips?: WalkClipMap;
	thumb?: string;
	accent?: string;
	tags?: string[];
}

export declare const WALK_AVATARS: WalkAvatar[];
export declare const DEFAULT_AVATAR_ID: string;
export declare const DEFAULT_SHARED_CLIPS: Record<string, string>;

export declare function getAvatar(id: string): WalkAvatar | null;
export declare function defaultAvatar(): WalkAvatar;
export declare function listCategories(): string[];
export declare function makeApiAvatarEntry(
	id: string,
	opts?: { name?: string; accent?: string },
): WalkAvatar;
export declare function resolveAvatarUrl(
	entry: WalkAvatar,
	opts?: { assetBase?: string; apiBase?: string },
): string | null;

/** Options accepted by `createWalkCompanion`. */
export interface WalkCompanionOptions {
	/** Roster shown in the picker and resolvable by id. Defaults to WALK_AVATARS. */
	avatars?: WalkAvatar[];
	/** Avatar to load when none is chosen/stored. Defaults to 'robot'. */
	defaultAvatarId?: string;
	/** Base prepended to static GLB paths (e.g. a CDN origin). */
	assetBase?: string;
	/** Base prepended to the `/api/avatars/<id>/glb` proxy. */
	apiBase?: string;
	/** URL of the shared animation manifest. Defaults to '/animations/manifest.json'. */
	manifestUrl?: string;
	/** Route prefixes where the companion never mounts. */
	excludedRoutes?: string[];
	/** Show the avatar picker button. Defaults to true. */
	enablePicker?: boolean;
	/** Override the page-context greeting; return null to fall back to the default. */
	greeting?: (path: string) => string | null;
	/** Optional "make your own" link shown in the picker footer. */
	docsUrl?: string;
	/** Storage key prefix. Defaults to 'walk'. */
	storagePrefix?: string;
}

/** The controller returned by `createWalkCompanion`. */
export interface WalkCompanionControl {
	readonly instance: unknown;
	isEnabled(): boolean;
	enable(): void;
	disable(): void;
	toggle(): void;
	/** Persist and (if mounted) hot-swap the live avatar. */
	setAvatar(idOrEntry: string | WalkAvatar): void;
	openPicker(): void;
	/** Run the app-style auto-mount + deep-link logic (reads ?walk= and saved state). */
	bootstrap(): void;
}

export declare function createWalkCompanion(opts?: WalkCompanionOptions): WalkCompanionControl;

/** A controller exposing setState/playWave for a loaded avatar. */
export interface WalkController {
	setState(state: WalkState): void;
	playWave(): void;
	update(dt: number): void;
	dispose(): void;
}

export declare function loadWalkAvatar(
	entry: WalkAvatar,
	opts?: {
		assetBase?: string;
		apiBase?: string;
		manifestUrl?: string;
		fallbackEntry?: WalkAvatar | null;
		waveMs?: number;
	},
): Promise<{ model: Object3D; controller: WalkController; gltf: unknown; entry: WalkAvatar }>;

export type PlaygroundMode = 'stroll' | 'platformer';

export declare function launchPlayground(opts?: {
	avatarId?: string | null;
	startScreen?: { x: number; y: number } | null;
	dropIn?: boolean;
	mode?: PlaygroundMode;
	config?: unknown;
}): unknown;
export declare function exitPlayground(): void;
export declare function switchPlaygroundMode(forceMode?: PlaygroundMode | null): unknown;
export declare function getPlaygroundMode(): PlaygroundMode;
export declare function shouldDropIn(config?: unknown): boolean;
export declare function consumeDropIn(config?: unknown): boolean;
export declare function playgroundState(): Record<string, unknown> | null;

/** Avatar picker popover. */
export interface AvatarPicker {
	el: HTMLElement;
	show(): void;
	close(): void;
	toggle(): void;
	isOpen(): boolean;
	setCurrent(id: string): void;
	destroy(): void;
}

export declare function createAvatarPicker(opts: {
	avatars: WalkAvatar[];
	currentId?: string | null;
	onSelect: (entry: WalkAvatar) => void;
	anchor?: { right: number; bottom: number };
	assetBase?: string;
	docsUrl?: string;
}): AvatarPicker;

export interface WalkConfig {
	avatars: WalkAvatar[];
	defaultAvatarId: string;
	assetBase: string;
	apiBase: string;
	manifestUrl: string;
	excludedRoutes: string[];
	enablePicker: boolean;
	greeting: ((path: string) => string | null) | null;
	docsUrl: string | null;
	keys: Record<string, string>;
}

export declare function resolveConfig(opts?: WalkCompanionOptions): WalkConfig;
export declare function resolveAvatarEntry(id: string | null, config: WalkConfig): WalkAvatar;
export declare const DEFAULT_EXCLUDED_PREFIXES: string[];
