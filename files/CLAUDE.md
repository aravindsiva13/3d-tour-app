# CLAUDE.md

Project context for Claude Code. Read this before making any change.

## What this is

A single-project real estate microsite. The centrepiece is video-segment
navigation: the user taps a hotspot, a short clip flies the camera there, and
the video freezes on a hold frame. There is no backend. It builds to static
files.

## Invariants — do not violate these without being asked

1. **No backend, no database, no API routes, no forms.** `next.config.mjs` uses
   `output: "export"`. If a change would break static export, stop and say so
   instead of adding a server.
2. **`config/project.ts` is the entire product surface.** Everything the site
   renders comes from it. Never hardcode a project name, a clip path, an area
   figure, or a hotspot coordinate into a component. If you need new data, add
   a field to the config type first.
3. **Hub-and-spoke routing only.** Every journey goes through the hub point.
   Never add direct point-to-point clips — that turns 10 clips into 30.
4. **The still layer never unmounts.** A poster image always sits under the
   video showing the current hold frame. The site must remain a usable tour
   with every clip failing to load.
5. **All videos are `muted`, `playsInline`, `preload="none"` initially.**
   Removing any of these breaks iOS Safari.
6. **Hotspot positions are percentages**, stored in config. Never pixel values.
7. **RERA number visible in the footer and on the hero.** Legally required.

## Stack — settled, do not substitute

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 15, App Router, static export | Familiar, free static hosting |
| Styling | Plain CSS in `app/globals.css`, semantic class names | Video-first UI is ~30 rules; utility soup adds nothing |
| 360 viewer | `three` with hand-rolled pointer controls | Only needs yaw/pitch/fov; OrbitControls is overkill and its touch behaviour is unpredictable |
| Floor plans | `react-zoom-pan-pinch` | Saves ~150 lines of pinch handling |
| Map | `leaflet` + `react-leaflet` + Carto tiles | No API key, no billing, no quota |
| Video | Native `<video>`, one element per clip | HLS/dash is unnecessary for 3-second clips |

Do not add: a state manager, a component library, an animation library, an
analytics SDK, or a CMS. If something feels like it needs one, say why first.

## Code style

- TypeScript strict. No `any`. No non-null assertions except where a config
  invariant guarantees the value.
- Components are the smallest thing that owns its own state. No prop drilling
  past one level.
- Comments explain *why*, never *what*. Every non-obvious line in the video
  engine gets one — future-you will not remember why the poster extraction
  uses `-sseof`.
- Accessibility is not optional: keyboard reachable, visible focus,
  `prefers-reduced-motion` respected, meaningful `aria-label` on anything
  icon-only.

## Known traps

- **iOS autoplay**: a video without `muted` + `playsInline` will either refuse
  to play or hijack into fullscreen. Test on a real device, not the simulator.
- **Leaflet + SSR**: leaflet touches `window` at import time. The map component
  must be loaded with `dynamic(..., { ssr: false })`.
- **three.js cleanup**: dispose geometry, material, texture and renderer in the
  effect cleanup, and remove the canvas from the DOM. Otherwise every open of
  the panorama leaks a WebGL context and Safari kills the tab after ~8.
- **Poster/frame mismatch**: the poster for a point must be extracted from the
  last frame of that point's inbound clip. Any other source produces a visible
  flicker when the transition ends.
- **Parallel preloading**: loading all clips at once starves the first one and
  the opening tap stutters. Preload sequentially, inbound clips first.
- **`stage` height**: use `100svh`, not `100vh`. Mobile browser chrome will
  otherwise crop the bottom of the jump bar.

## Commands

```bash
npm run dev      # local
npm run build    # static output in ./out
npm run encode   # bash scripts/encode.sh — masters to web assets
```

## Definition of done for any task

- `npm run build` succeeds with no type errors
- Works on iPhone Safari and mid-range Android Chrome
- Works with JavaScript slow: no layout shift, no flash of black
- Keyboard reachable with visible focus
- No new dependency added without stating the reason
