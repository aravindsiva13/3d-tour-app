# Master implementation plan

Build order for the property microsite MVP. Work top to bottom. Each phase has
a goal, the files it touches, the prompt to give Claude Code, and acceptance
criteria you must actually check before moving on.

Read `CLAUDE.md` first — it holds the invariants that every phase depends on.

**Estimated: 4 working weeks.** Phase 0 is two days and gates everything else.

---

## File manifest

Everything the finished project contains. Nothing else should appear.

```
CLAUDE.md                        project rules, read every session
IMPLEMENTATION_PLAN.md           this file
README.md                        asset spec to forward to the render studio
package.json
next.config.mjs                  output: "export"
tsconfig.json                    paths: { "@/*": ["./*"] }
postcss.config.mjs
tailwind.config.ts

lib/
  types.ts                       ProjectConfig, Point, Hotspot, FloorPlan, MapPin

config/
  project.ts                     THE PRODUCT. One file per client.

app/
  layout.tsx                     fonts, metadata, viewport
  page.tsx                       composition only, no logic
  globals.css                    entire stylesheet

components/
  VideoNavigator.tsx             the engine
  HotspotMarker.tsx              the signature element
  InfoPanelCard.tsx              per-point panel
  PanoramaViewer.tsx             three.js 360 overlay
  FloorPlans.tsx                 tabs + pan/zoom
  LocationMap.tsx                section wrapper, dynamic import
  MapCanvas.tsx                  client-only leaflet

scripts/
  encode.sh                      ffmpeg pipeline

public/media/
  source/                        studio masters, gitignored
  clips/  posters/  pano/  plans/
```

---

## Phase 0 — Seam spike (2 days, do this first)

**Goal:** prove the transition seam is invisible on a real phone before you
commit to a delivery date. This is the only genuine unknown in the project.

**Prompt:**

> Create a throwaway Next.js page with three buttons and two stacked `<video>`
> elements. Each button plays a different 3-second clip and freezes on its last
> frame. Videos must be muted, playsInline, and preloaded before the first tap.
> No styling beyond making it full-bleed. I want to test whether the freeze at
> the end of a clip is seamless.

Then cut three test clips from any stock drone footage with ffmpeg, using
hold frames at both ends.

**Acceptance:**
- [ ] No black flash between the clip ending and the frozen frame
- [ ] No flash on iPhone Safari specifically — test on hardware
- [ ] Tapping a second button while paused resumes cleanly
- [ ] Works on a mid-range Android on throttled 4G

**If this fails, stop.** Do not quote a date. Diagnose the flash first — it is
almost always a missing `playsInline`, a `preload="none"` that never got
upgraded, or a clip whose final frame is a P-frame that decodes late.

---

## Phase 1 — Skeleton and config (week 1)

**Goal:** the whole site renders from placeholder data, deployed to a real URL
you can send the client, before a single real asset exists.

**Files:** `package.json`, `next.config.mjs`, `tsconfig.json`,
`lib/types.ts`, `config/project.ts`, `app/layout.tsx`, `app/page.tsx`,
`app/globals.css`

**Prompt:**

> Scaffold a Next.js 15 App Router project with static export enabled and the
> `@/*` path alias. Create `lib/types.ts` defining ProjectConfig, Point,
> Hotspot, InfoPanel, FloorPlan and MapPin — points carry clipIn, clipOut,
> poster, hotspots keyed by target point id with x/y as percentages, an
> optional panel and an optional panorama path. Export a HUB constant. Then
> create `config/project.ts` with six points (hub, entrance, lobby, clubhouse,
> pool, residence), three floor plans and eight map pins, all placeholder.
> Finally a `page.tsx` that just proves the config renders.

Then set up the design system:

> Write `app/globals.css` and `app/layout.tsx`. Palette: `--ink #131A17`,
> `--ink-raised #1C2521`, `--limestone #E6E2D8`, `--limestone-dim #9AA39C`,
> `--brass #B4914F`, plus hairline rgba variables. Type: Instrument Serif for
> display, Instrument Sans for UI, both via `next/font/google`. Brass appears
> only on hotspot rings and active states — everywhere else is hairlines and
> type. No gradients except the bottom scrim over the video.

**Acceptance:**
- [ ] `npm run build` produces `./out` with no type errors
- [ ] Deployed to Cloudflare Pages or Vercel, live URL in hand
- [ ] Changing a value in `config/project.ts` visibly changes the page
- [ ] No project-specific string exists anywhere outside `config/project.ts`

---

## Phase 2 — The video engine (week 2)

**Goal:** the mechanic works end to end with placeholder clips.

**Files:** `components/VideoNavigator.tsx`, `components/HotspotMarker.tsx`,
`components/InfoPanelCard.tsx`

Build in this order — each step is independently testable.

**2a. State machine**

> Build `VideoNavigator.tsx` as a client component taking `project` as a prop.
> State: `current` point id starting at HUB, `busy` boolean, `visibleClip`
> string or null. Implement `navigate(target)` using hub-and-spoke: if we're
> not at the hub, play the current point's clipOut first, then the target's
> clipIn. Ignore navigation calls while busy. Render every clip as its own
> `<video>` element, all stacked absolutely, only the active one at opacity 1.

**2b. Playback and freeze**

> Add a `playClip(src)` that sets currentTime to 0, makes the element visible,
> calls play(), and awaits the `ended` event. Do not reset or hide the element
> afterwards — the paused last frame is the hold frame we arrive on. Write a
> `once(el, event, timeout)` helper that also resolves on `error` and on
> timeout so one bad clip can never wedge the tour.

**2c. Preloading**

> Add sequential preloading: build the clip list with all inbound clips first,
> then outbound. For each, set preload to auto, call load(), and await
> canplaythrough before starting the next. Show a "Preparing the tour" status
> until the first clip is ready. Parallel loading starves the first clip — keep
> it sequential.

**2d. Fallback**

> Add a `useMode()` hook returning "video" or "stills". Return "stills" when
> `prefers-reduced-motion` is set, when `navigator.connection.saveData` is
> true, or when effectiveType is slow-2g, 2g or 3g. In stills mode skip video
> entirely and crossfade the poster images. Keep the still `<img>` layer
> mounted in both modes, under the videos.

**2e. Hotspots and panels**

> Build `HotspotMarker.tsx`: an absolutely positioned button at x%/y% with an
> SVG ring that draws itself via stroke-dashoffset on hover and focus, a
> hairline rule that extends, and a label that fades in. On coarse pointers
> show the label and completed ring permanently, since touch has no hover.
> Hide the whole hotspot layer while `busy` is true. Then `InfoPanelCard.tsx`
> for the resting state: title, body, facts list, and a "Look around" button
> when the point has a panorama.

Also add: a jump bar so any point is reachable in one tap, and Escape returns
to the hub.

**Acceptance:**
- [ ] Tap any hotspot, camera flies there, freezes, panel appears
- [ ] Tap a second point from a non-hub point — plays two clips back to back
- [ ] No hotspot is clickable mid-flight
- [ ] Throttle to Slow 3G in DevTools: stills mode engages, site usable
- [ ] Kill the network entirely after load: posters still render the full tour
- [ ] Tab through every hotspot with visible focus; Escape returns to hub
- [ ] iPhone Safari: no fullscreen hijack, no black flash

---

## Phase 3 — Panorama, plans, map (week 3)

**Files:** `PanoramaViewer.tsx`, `FloorPlans.tsx`, `LocationMap.tsx`,
`MapCanvas.tsx`

**3a. Panorama**

> Build `PanoramaViewer.tsx` as a full-screen overlay using three.js. A
> SphereGeometry of radius 500 with `scale(-1, 1, 1)` and the equirectangular
> texture on a MeshBasicMaterial, camera at the centre. Hand-roll the controls:
> pointer drag maps to lon/lat with the speed scaled by current fov, wheel and
> two-finger pinch change fov between 32 and 96, lat clamped to ±85. Add a slow
> ambient drift when not dragging. Escape closes. In the effect cleanup dispose
> the geometry, material, texture and renderer and remove the canvas from the
> DOM — leaking WebGL contexts kills Safari after about eight opens. Handle the
> texture load error with a readable message, not a blank screen.

**3b. Floor plans**

> Build `FloorPlans.tsx` with a tab per plan type, a definition list showing
> carpet area, built-up area and facing, and a `react-zoom-pan-pinch` viewer
> with zoom in / zoom out / reset controls. The plan stage gets a light
> background — it's the one bright surface on the page. Double-tap zooms.

**3c. Map**

> Build `LocationMap.tsx` as the section wrapper with a legend listing each pin
> and its drive time, and `MapCanvas.tsx` as a client-only leaflet map loaded
> via `dynamic(..., { ssr: false })` with a placeholder while it loads. Use
> Carto light tiles and CircleMarker rather than the default pin icon, whose
> PNG path breaks under the bundler. Scroll wheel zoom off — it hijacks page
> scroll on desktop.

**Acceptance:**
- [ ] Panorama drags smoothly on touch, pinch zooms, no seam visible
- [ ] Open and close the panorama ten times — no slowdown, no lost context
- [ ] Floor plan pinch-zooms on mobile without scrolling the page
- [ ] Map renders with no console errors and no SSR crash on `npm run build`
- [ ] Every drive time in the legend matches a pin on the map

---

## Phase 4 — Real assets (week 4, first half)

**Goal:** studio media in, encoded, hotspots positioned.

**Prompt:**

> Write `scripts/encode.sh`. It reads masters from `public/media/source`,
> encodes each to H.264 at 1920 wide with `-crf 23 -g 15 -movflags +faststart
> -an`, extracts each point's poster from the LAST frame of its inbound clip
> using `-sseof -0.1`, extracts the hub poster from the first frame of any
> outbound clip, and resizes panoramas to 4096x2048. Print folder sizes at the
> end with a note that clips should stay under 25 MB for six points.

Then position hotspots. This is manual and takes an afternoon: screenshot the
hub hold frame, measure each target as a percentage of frame width and height,
write those into `config/project.ts`. Check them at 16:9, 4:3 and 9:16 — the
video is `object-fit: cover`, so edges crop differently per aspect ratio. Keep
every hotspot inside the middle 70% of the frame and none of them will crop.

**Acceptance:**
- [ ] Clips folder under 25 MB total
- [ ] Every poster is pixel-identical to its clip's final frame — no flicker
- [ ] No colour or exposure pop at any seam
- [ ] Hotspots land correctly on phone portrait, tablet and desktop

---

## Phase 5 — QA and handover (week 4, second half)

**Device matrix — all must pass:**

| Device | Checking for |
|---|---|
| iPhone Safari, real hardware | autoplay, no fullscreen hijack, no black flash |
| Android Chrome, mid-range | transition stutter, memory pressure |
| iPad | hotspot positions at 4:3 |
| Desktop 1440 and 2560 | scrim legibility, jump bar overflow |
| Slow 3G throttle | stills fallback, under 3s to interactive |
| Keyboard only | every hotspot reachable, focus visible |

**Also:**
- [ ] Lighthouse mobile performance above 85
- [ ] RERA number on hero and in footer
- [ ] Disclaimer text exactly as the client's legal team supplied it
- [ ] Open Graph image renders correctly in a WhatsApp share preview
- [ ] Rotate the phone mid-transition — nothing breaks
- [ ] Background the app mid-transition and return — nothing breaks

**Handover:** the repo, the live URL, the `README.md` asset spec, and a short
note on how to add a seventh point (two clips, one poster, one config entry).

---

## Explicitly out of scope

Named here so they stay quotable as Phase 2 rather than assumed free:

enquiry form, brochure download gate, lead dashboard, CRM integration,
clickable master plan with unit availability, EMI calculator, multi-project
CMS, sales presenter mode, multilingual copy, analytics beyond a page-view tag.

---

## Working with Claude Code on this

- Start every session by pointing it at `CLAUDE.md`. It holds the invariants
  and the trap list.
- Work one phase per session. The video engine in particular degrades if you
  ask for preloading, fallback and hotspots in a single prompt — it will
  produce something that runs and quietly drops the error handling.
- After each phase, ask: *"review this against the invariants in CLAUDE.md and
  tell me what you violated."* It catches more than a diff read does.
- When it wants to add a dependency, make it justify the choice against what's
  already in the stack table first.
- Commit at every acceptance checkpoint, not at the end of a phase. The video
  engine is the one place where you will want to roll back.
