# 01 - Research

## The reference: oso95/scroll-world

Repo: https://github.com/oso95/scroll-world

What it does:

- Builds a landing page where scroll position drives a pre-rendered video. The camera "flies" from one scene into the next without cuts.
- Pipeline: scene stills (image model) -> one clip per scene -> connector clips between scenes -> ffmpeg encode -> a vanilla JS scrub engine.
- The most important rule in the skill: seams must be frame-identical. A connector must start on the ACTUAL last frame of the previous clip and end on the ACTUAL first frame of the next clip, not on the original still. Otherwise you get a visible pop.
- Two camera architectures:
  - A: one continuous forward take, every leg starts on the previous leg's last frame.
  - B: dive into each scene + an aerial connector that pulls up and out. Works for miniature/diorama worlds, but in a realistic world the backward pull reads as a rewind.
- Engine details worth keeping: load clips as Blob URLs (so the video is always seekable, even on hosts without byte-range support), coalesce seeks (never set a new `currentTime` while the decoder is still seeking), keep the still as a poster until the video paints (iOS), `prefers-reduced-motion` fallback.

What I take from it:

- The seam method (actual frames in, actual frames out).
- The camera grammar idea: inside a clip the camera can do anything, but across a seam the direction must never reverse.
- ffmpeg commands for frame extraction and encoding (small GOP, no audio, faststart).

What I do differently:

- My world is realistic (photo/product style), not a clay diorama, so I avoid the "pull up and out" connectors. All my connectors keep moving forward.
- Instead of switching between 7 separate `<video>` elements, I join all clips into one video with ffmpeg and scrub a single timeline. Fewer moving parts, no DOM crossfade logic, and the seams are fixed in the file itself.
- Generation goes through Magnific MCP (Seedance 2.5 keyframes) instead of Higgsfield / Monid.

## Other scroll-driven sites I studied

| Site | What happens | What I learned |
|---|---|---|
| Apple AirPods Pro / iPhone product pages (apple.com) | The product rotates and opens as you scroll. Built with an image sequence drawn on a canvas. | Scroll = time works best when the object stays centered and the motion is slow. Short text appears beside the object, never on top of it. |
| Igloo Inc (igloo.inc) | A 3D world of ice blocks you travel through by scrolling. Awwwards site of the year 2024. | A strong single material (ice) makes everything feel like one world. Very little text, big confidence. |
| NYT "Snow Fall" (2012) | Long-form article with video and maps that react to scroll. | The classic scrollytelling pattern: text blocks scroll, the media stays pinned behind them. |
| Emons (logistics) | The site the reference skill copies: an isometric world you glide through. | One fixed camera angle keeps a whole company story calm and readable. |
| The Pudding (pudding.cool) | Data stories where a pinned chart changes per scroll step. | Clear "steps": each scroll step has one idea. Good model for my 4 text panels. |

My own notes after opening each site (to fill in):

- [ ] Apple:
- [ ] Igloo Inc:
- [ ] Snow Fall:
- [ ] Emons:
- [ ] The Pudding:

## Conclusions for my project

1. One subject, followed all the way. The audience needs something to hold on to. In my world that is one trading card that travels from a drawer to a display case.
2. Text outside the video, short, one idea per scene.
3. Slow camera. Fast camera + scrub = motion sickness and stutter.
4. A clear "scroll" hint at the start and a clear action at the end.
5. A real fallback for people who disable motion.
