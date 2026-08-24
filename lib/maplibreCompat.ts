import maplibregl from 'maplibre-gl';

/**
 * Compatibility shim: maplibre-gl 3.x + react-map-gl 8.x.
 *
 * react-map-gl@8 wraps @vis.gl/react-maplibre@8, which declares a peer of
 * `maplibre-gl >= 4.0.0`. This project is pinned to 3.6.2 on purpose (commit
 * 6cb91c4, "Downgrade maplibre-gl to 3.6.2 to fix react-map-gl event crash").
 *
 * On every `style.load` the wrapper snapshots the style components:
 *
 *     this._styleComponents = {
 *       light: map.getLight(),
 *       sky: map.getSky(),            // <-- added in maplibre-gl v4
 *       projection: map.getProjection?.(),
 *       terrain: map.getTerrain()
 *     };
 *
 * `getLight` and `getTerrain` exist in 3.6.2; `getSky` does not, so it throws
 * "map.getSky is not a function" every time a style loads — which is also why
 * it reappeared each time the basemap toggled.
 *
 * The shim reports "no sky", which is truthful: this is a flat locality map
 * with rotation and pitch disabled, so there is no sky to describe. `setSky` is
 * shimmed defensively too, though the wrapper only calls it when a `sky` prop
 * is passed, and we never pass one.
 *
 * This is a targeted patch, not the permanent fix — see the note in the PR /
 * handover: the durable resolution is aligning maplibre-gl and react-map-gl
 * major versions, which needs a regression pass over the event handling that
 * caused the original downgrade.
 */

type SkyCapableMap = {
  getSky?: () => unknown;
  setSky?: (spec?: unknown) => void;
};

export function installMaplibreCompat(): void {
  const proto = maplibregl?.Map?.prototype as unknown as SkyCapableMap | undefined;
  if (!proto) return;

  if (typeof proto.getSky !== 'function') {
    proto.getSky = function getSky() {
      return undefined;
    };
  }

  if (typeof proto.setSky !== 'function') {
    proto.setSky = function setSky() {
      /* no sky support in maplibre-gl 3.x — intentional no-op */
    };
  }
}

// Run on import so the patch is in place before any Map is constructed.
installMaplibreCompat();
