// Lazily resolve the meshopt decoder from three's addons.
//
// Server-baked avatars (the `/api/avatars/<id>/glb` lane) emit
// EXT_meshopt_compression but never Draco/KTX2, so we wire ONLY the meshopt
// decoder onto the GLTFLoader. That keeps the walk chunk small and avoids
// pulling the heavier Draco/KTX2 loader init. Uncompressed rigs (the static
// `/avatars/*.glb` and RobotExpressive) ignore the decoder harmlessly.

let _promise = null;

export function getMeshoptDecoder() {
	if (_promise) return _promise;
	_promise = import('three/addons/libs/meshopt_decoder.module.js').then((m) => m.MeshoptDecoder);
	return _promise;
}
