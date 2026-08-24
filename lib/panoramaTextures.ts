import * as THREE from 'three';

/**
 * Panorama texture manager.
 *
 * One cache for the whole viewer. Previously the viewer held two independent
 * caches (drei's `useTexture` loader cache plus a local Map), so every 4K
 * equirectangular image was fetched and decoded twice and kept on the GPU
 * twice — and nothing was ever released. With 16 nodes at 4096x2048 RGBA that
 * trends toward ~700MB of texture memory.
 *
 * What this does instead:
 *   - decodes off the main thread via createImageBitmap, so a 4K decode never
 *     blocks rotation or the React tree (the main cause of the hitch on
 *     transition),
 *   - keeps at most MAX_RESIDENT textures alive, evicting least-recently-used,
 *   - disposes the GPU texture *and* closes the ImageBitmap on eviction.
 */

/** Current node + incoming node + a couple of warm neighbours. */
const MAX_RESIDENT = 4;

interface Entry {
  promise: Promise<THREE.Texture>;
  texture: THREE.Texture | null;
  lastUsed: number;
}

const cache = new Map<string, Entry>();
const pinnedSrcs = new Set<string>();
let tick = 0;

function applyTextureSettings(tex: THREE.Texture): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace;
  // Sharpens the poles and grazing angles of the sphere. three clamps this to
  // the device's max anisotropy, so 4 is safe everywhere.
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Decode through a plain <img> plus HTMLImageElement.decode().
 *
 * decode() performs the expensive raster work off the main thread, which is the
 * property we actually want — a 4K panorama no longer blocks rotation or React
 * while it decodes.
 *
 * Deliberately NOT fetch() + createImageBitmap, which is the other way to get an
 * off-thread decode. Two reasons:
 *   1. fetch() is a hookable global. Network-inspector browser extensions wrap
 *      it, and a wrapped fetch that fails surfaces as "TypeError: Failed to
 *      fetch" from inside the extension's own script. <img> loads go down the
 *      browser's ordinary image pipeline and are not affected.
 *   2. three ignores Texture.flipY for ImageBitmap sources, so orientation has
 *      to be baked in at bitmap-creation time — an easy thing to get subtly
 *      wrong. With an <img> source three's default flipY=true applies, which is
 *      exactly the original TextureLoader behaviour.
 */
function decode(src: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';

    const build = () => {
      const tex = new THREE.Texture(img);
      resolve(applyTextureSettings(tex));
    };

    img.onload = () => {
      // Already loaded here; decode() moves the raster work off the main thread.
      // If it is missing or rejects, the bits are in hand either way — proceed.
      if (typeof img.decode === 'function') img.decode().then(build, build);
      else build();
    };
    img.onerror = () => reject(new Error(`panorama load failed: ${src}`));

    img.src = src;
  });
}

/** Load (or return the in-flight/cached) texture for a panorama. */
export function loadPanorama(src: string): Promise<THREE.Texture> {
  let entry = cache.get(src);

  if (!entry) {
    const created: Entry = { promise: null as never, texture: null, lastUsed: ++tick };
    created.promise = decode(src).then((tex) => {
      // Only keep it if the entry is still the live one for this src; an
      // eviction during the in-flight decode must not resurrect it.
      if (cache.get(src) === created) created.texture = tex;
      else tex.dispose();
      return tex;
    });
    cache.set(src, created);
    entry = created;
  }

  entry.lastUsed = ++tick;
  return entry.promise;
}

/**
 * Declare which panoramas must stay resident (the one on screen and the one
 * being transitioned to). Everything else becomes evictable.
 */
export function pinResident(srcs: Array<string | undefined | null>): void {
  pinnedSrcs.clear();
  for (const s of srcs) if (s) pinnedSrcs.add(s);
  evict();
}

function evict(): void {
  if (cache.size <= MAX_RESIDENT) return;

  const evictable = Array.from(cache.entries())
    // An entry still decoding has no texture to dispose; leave it alone.
    .filter(([src, e]) => !pinnedSrcs.has(src) && e.texture !== null)
    .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

  let size = cache.size;
  for (const [src, entry] of evictable) {
    if (size <= MAX_RESIDENT) break;
    disposeEntry(entry);
    cache.delete(src);
    size--;
  }
}

function disposeEntry(entry: Entry): void {
  const tex = entry.texture;
  if (!tex) return;
  const image = tex.image as { close?: () => void } | undefined;
  tex.dispose();
  // Frees the CPU-side bitmap; the GPU copy is gone with dispose().
  image?.close?.();
  entry.texture = null;
}

/** Called when the viewer closes — release everything. */
export function disposeAllPanoramas(): void {
  for (const entry of cache.values()) disposeEntry(entry);
  cache.clear();
  pinnedSrcs.clear();
}

/**
 * Warm neighbours during idle time, one at a time.
 *
 * Firing all of a node's links at once meant up to four simultaneous 4K
 * fetch+decodes competing with the transition that was already running.
 * Returns a cancel function.
 */
export function preloadIdle(srcs: string[]): () => void {
  let cancelled = false;
  let handle: number | undefined;

  const schedule = (cb: () => void) => {
    const ric = (globalThis as { requestIdleCallback?: (c: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    handle = ric ? ric(cb, { timeout: 2000 }) : (setTimeout(cb, 300) as unknown as number);
  };

  const step = (i: number) => {
    if (cancelled || i >= srcs.length) return;
    loadPanorama(srcs[i]).catch(() => {}).finally(() => {
      if (!cancelled) schedule(() => step(i + 1));
    });
  };

  schedule(() => step(0));

  return () => {
    cancelled = true;
    const cic = (globalThis as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
    if (handle !== undefined) {
      if (cic) cic(handle);
      else clearTimeout(handle);
    }
  };
}
