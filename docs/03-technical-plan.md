# 03 - Technical plan

## Stack

- Plain HTML, CSS and JavaScript. No framework, no build step. Easy to host on GitHub Pages.
- Google Fonts: Archivo + IBM Plex Mono.
- ffmpeg / ffprobe for all video work (via small Node scripts in `tools/`).
- Playwright for testing scroll behaviour.
- Generation: Magnific MCP inside Claude (images + Seedance 2.5 video).

## Scroll / playback system

1. All 7 clips (4 scenes + 3 transitions) are joined into **one** video file: `media/world-1280.mp4`. The join has a very short crossfade (4 frames) at each seam to hide tiny differences.
2. `tools/build-video.mjs` also writes `media/manifest.json` with the start and end time of every clip inside the joined video.
3. The page has a tall scroll area. The video is `position: sticky` and fills the screen.
4. Scroll progress (0 to 1) is mapped to video time with a **piecewise linear map**: scenes get more scroll distance than transitions, so the visitor "stays" in each scene a bit longer while the text is visible.
5. Every animation frame, the displayed time moves smoothly toward the target time (lerp). We only set `video.currentTime` when the previous seek is finished (seek coalescing). This keeps fast scrolling from freezing the decoder.
6. Scroll back = the same map in reverse, so backward always works.

## Media loading

- The video is downloaded with `fetch()` as a Blob and played from an object URL. A Blob is always fully seekable, even on hosts that don't support byte-range requests.
- A loading screen shows the download percentage. The first scene still is shown as a poster while loading, so the page is never blank.
- Desktop gets `world-1280.mp4` (1280x720, GOP 8). Phones get `world-854.mp4` (854x480, GOP 4, lighter to decode).

## Encoding

```
ffmpeg -i joined.mp4 -an -vf "scale=1280:720,unsharp=5:5:0.6" \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart world-1280.mp4
```

- No audio (`-an`).
- Small GOP so seeks are fast; not all-intra (too big).
- `faststart` so metadata is at the start of the file.

## Target resolution

- Generation: Seedance 2.5 on Magnific outputs 480p or 720p. Tests at 480p (cheap), final clips at 720p 16:9.
- Page: 1280x720 master. Optional upscale later only if credits allow (video upscale is expensive).
- Stills: 2K, 16:9. They are used as start frames, as posters and in the reduced-motion version.

## Reduced-motion fallback

If `prefers-reduced-motion: reduce` is on (or video fails to load):

- No video, no scrubbing.
- The 4 scene stills are shown as normal full-width sections, each with its text panel. Same story, no motion.

## Interface

- Scroll hint at the start ("Scroll to follow the card"), disappears after the first scroll.
- 4 text panels, one per scene, fade in and out based on scroll position. Text never sits inside the video file.
- Progress rail with 4 steps (`001/004`).
- Final CTA panel + a normal section below the film (how it works, rates, form, contact).
- Keyboard: the page scrolls normally, so arrow keys / space also drive the film.

## Testing

- `tests/check.mjs` (Playwright): loads the page, scrolls forward and backward in steps, checks that `currentTime` follows scroll, that there are no console errors, and takes screenshots right before and after every seam.
- Mobile viewport test (390x844).
- Reduced-motion test (emulated).

## Repo and publishing

- Dedicated repo, commits after every step.
- GitHub Pages from `main` (root). Live URL in README.
