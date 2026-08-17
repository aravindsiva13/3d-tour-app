# Property microsite — MVP

A single-project interactive microsite. Video-segment navigation between six
hold points, 360° panoramas, floor plans, location map. No backend, no
database, no forms — it builds to static files.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in ./out
```

Deploy `./out` to Cloudflare Pages, Vercel, Netlify, or any static host.
Because there's no server, hosting is free to about ₹200/month at this scale.

## Shipping a second client

1. Copy `config/project.ts`, change the values
2. Drop the new media into `public/media/`
3. Build

No code changes. That's the point of the config shape — protect it.

---

## Asset spec — give this to the render studio verbatim

### Video clips

One file per transition. Naming is load-bearing:

```
hub-entrance.mov     hub → entrance
entrance-hub.mov     entrance → hub
hub-lobby.mov        hub → lobby
lobby-hub.mov        lobby → hub
...
```

Six points means ten clips (the hub has none of its own).

Requirements:

- **Camera comes to a complete rest for at least 12 frames at both ends.**
  This is the single thing that makes or breaks the build. If the camera is
  still drifting at the end of a clip, there is no hold frame to freeze on and
  the transition will visibly jump.
- **The last frame of `hub-entrance` must be pixel-identical to the first
  frame of `entrance-hub`.** Same for every pair. Render them as one continuous
  move and cut, don't render them separately.
- 3–5 seconds each. Under 3 feels abrupt, over 5 feels slow on a second viewing.
- 3840×2160, 30fps, ProRes 422 or high-bitrate H.264. We handle web encoding.
- Identical time of day, lighting setup, camera height and lens across every
  clip. Mismatches show up as a colour pop at every seam.
- No audio, no titles, no logos burned in.

### Panoramas

One per point that gets a "Look around" button. Equirectangular, strictly 2:1
ratio, 6144×3072 or larger, JPEG. Camera at eye height, 1.6m.

### Floor plans

One PNG or JPEG per unit type, 3000px on the long edge, white background,
no developer letterhead or watermark.

### Everything else

Logo (SVG), project name, tagline, RERA number, unit areas, amenity list,
approved marketing copy, and the exact disclaimer text your legal team wants
in the footer.

---

## Encoding

Put the studio's masters in `public/media/source/`, panoramas in
`public/media/source/pano/`, then:

```bash
bash scripts/encode.sh
```

This encodes the clips, extracts every hold frame as a poster, and resizes the
panoramas. The poster extraction matters: the still layer under the video uses
the same frame the video freezes on, so there's no flicker when a transition
ends.

---

## How the navigation works

Every journey routes through the hub. Tapping "clubhouse" while standing at
"entrance" plays `entrance-hub` then `hub-clubhouse` back to back.

This is a deliberate constraint. Point-to-point navigation across six locations
would need 30 clips; hub-and-spoke needs 10. At twelve locations it's the
difference between 132 clips and 24. It also reads better — the camera pulling
back to an aerial before flying somewhere new is more legible than teleporting
sideways.

## Fallback path

Devices on a slow connection, with data saver on, or with reduced-motion
enabled get a still-image tour instead: same hotspots, same panels, no video.
Roughly a third of Indian mobile traffic will land here. It's a supported path,
not a degraded one — test it.

Force it locally with Chrome DevTools → Network → throttle to Slow 3G, or by
enabling reduced motion in your OS settings.

## Testing checklist before handover

- [ ] iPhone Safari — clips autoplay, no fullscreen hijack, no black flash
- [ ] Android Chrome, mid-range device — transitions don't stutter
- [ ] iPad — hotspot positions still land correctly at 4:3
- [ ] Desktop 1440px and 2560px
- [ ] Slow 3G — fallback triggers, site is usable in under 3 seconds
- [ ] Keyboard only — every hotspot reachable, focus visible, Escape returns to hub
- [ ] Every panorama loads and the seam is invisible
- [ ] RERA number present in the footer and on the hero
- [ ] Lighthouse performance above 85 on mobile

## Deliberately not in this build

Lead capture, enquiry form, brochure gate, lead dashboard, CRM integration,
clickable master plan with unit availability, EMI calculator, multi-project
CMS, sales presenter mode. All Phase 2.
