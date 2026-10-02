# 03 - Technical plan

## Stack

- Plain HTML, CSS and JavaScript. No framework, no build step. Easy to host on GitHub Pages.
- Google Fonts: Archivo + IBM Plex Mono.
- ffmpeg / ffprobe for all video work (via small Node scripts in `tools/`).
- Playwright for testing scroll behaviour.
- Generation: Magnific MCP inside Claude (images + Seedance 2.5 video).

## Scroll / playback system

**First version vs final version:** the first version scrubbed a `<video>` by setting `currentTime` on scroll. It stuttered, because the browser can't decode H.264 fast enough when you jump around in it. The final version draws an image sequence on a `<canvas>` instead (the method Apple uses on its product pages). Details below, the reason is in the process log.

1. All 7 clips (4 scenes + 3 transitions) are joined into **one** film with ffmpeg. Every seam gets a very short crossfade (4 frames) to hide tiny differences.
2. `tools/build-video.mjs` writes `media/manifest.json` with the start and end frame of every clip inside the joined film.
3. `tools/pack-frames.mjs` turns the film into 823 WebP frames and packs them into 4 files per size (`chunk-0.bin` ... `chunk-3.bin`) plus an `index.json` that says where each frame starts inside its file.
4. The page has a tall scroll area. The `<canvas>` is `position: sticky` and fills the screen (cover-fit, like `object-fit: cover`).
5. Scroll progress (0 to 1) is mapped to a frame number with a **piecewise linear map**: scenes get more scroll distance than transitions, so the visitor "stays" in each scene a bit longer while the text is visible.
6. Every animation frame, the shown frame moves smoothly toward the target frame (eased, independent of screen refresh rate), and only redraws when the frame number changes.
7. Scroll back = the same map in reverse, so backward always works and the same scroll position always shows the same frame.

## Media loading

- Frames are packed by importance: chunk 0 has every 8th frame, chunk 1 every 4th, chunk 2 every 2nd, chunk 3 the rest. After chunk 0 (about 3 MB) the whole film can already be scrolled, it just gets smoother while the other chunks load. If a frame isn't loaded yet, the nearest loaded frame is shown.
- Each chunk is downloaded once with `fetch()`, then every frame is cut out of it with `Blob.slice()` and turned into an `Image`.
- A loading screen shows the progress of the first chunk. The first scene still is shown as a poster while loading, so the page is never blank.
- Desktop gets 1280 px frames (about 24 MB in total). Phones get 854 px frames (about 13 MB).

## Encoding

- Clips are normalized to 1920x1080 at 24 fps, then joined.
- Frames are exported with ffmpeg's `libwebp`: quality 60 at 1280 px, quality 55 at 854 px.
- No audio.

## Real card compositing

Seedance refused to animate the real card (copyrighted character), so the clips were generated with an abstract holo card and the photo of the real card was put on top afterwards:

1. `tools/card-pipeline.py` uses hand-marked card corners on keyframes and tracks the card between them with dense optical flow (`tools/track-dense.py`), forward and backward, then blends and smooths the result.
2. `tools/composite-card.py` warps the card photo onto the tracked corners and keeps the light, shadows and reflections of the original scene.
3. The composited clips go through the normal build above.

## Target resolution

- Generation: Seedance 2.5 on Magnific at 1080p (the school account allowed it, so no upscale was needed). Tests at 480p first (cheaper).
- Page: 1280 px frames on desktop, 854 px on phones.
- Stills: 2K, 16:9. They are used as keyframes, as posters and in the reduced-motion version.

## Reduced-motion fallback

If `prefers-reduced-motion: reduce` is on (or the frames fail to load):

- No canvas, no scrubbing.
- The 4 scene stills are shown as normal full-width sections, each with its text panel. Same story, no motion.

## Interface

- Scroll hint at the start ("Scroll to follow the card"), disappears after the first scroll.
- 4 text panels, one per scene, fade in and out based on scroll position. Text never sits inside the frames.
- Progress rail with 4 steps (`001/004`).
- Final CTA panel + a normal section below the film (how it works, rates, form, contact).
- Keyboard: the page scrolls normally, so arrow keys / space also drive the film.

## Testing

- `tests/check.mjs` (Playwright, 16 checks): loads the page, scrolls forward and backward in steps, checks that the shown frame follows scroll both ways, measures smoothness (longest freeze while scrolling), checks the rail buttons, the final CTA and that there are no console errors.
- Mobile viewport test (390x844): lighter frames, no horizontal scroll.
- Reduced-motion test (emulated).

## Repo and publishing

- Dedicated repo, commits after every step.
- GitHub Pages from `main` (root). Live URL in README.
