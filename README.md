# Drawer to Display - MADATSU TCG

A scroll story for **MADATSU TCG**, my trading card shop in Mechelen. You follow one card from a forgotten drawer, through a check and an offer, to a lit display case. Scroll down and the camera moves forward, scroll up and it moves back.

The page is also a real landing page for our "sell us your cards" service. It ends with a WhatsApp offer form.

**Live website:** https://kazerodev.github.io/madatsu-scroll-world/

Thomas More, A2 Scroll World.

## How it works

- 4 scenes + 3 transitions, generated with Magnific MCP (stills + Seedance 2.5 keyframes).
- Every transition starts on the actual last frame of the previous scene and ends on the actual first frame of the next one.
- All 7 clips are joined into one video with ffmpeg (4-frame crossfade at each seam).
- Scroll position is mapped to video time. Scenes get more scroll distance than transitions, so you stay a bit longer where the text is.
- The video is loaded as a Blob so it is always seekable. Seeks only happen when the previous seek is done.
- Phones get a lighter 480p version. People with "reduce motion" on get a static version with the 4 scene images.

More detail in `docs/`:

1. [Research](docs/01-research.md)
2. [Concept and visual direction](docs/02-concept-and-visual-direction.md)
3. [Technical plan](docs/03-technical-plan.md)
4. [Magnific workflow](docs/04-magnific-workflow.md)
5. [Process log](docs/05-process-log.md)
6. [Prompts](docs/prompts/prompts.md)

## Project structure

```
index.html            page
css/style.css         styles
js/config.js          contact info, video paths, scroll pacing
js/main.js            scroll-to-video engine + interface
media/                final videos, manifest.json, stills
tools/                ffmpeg scripts (frames, seams, build, placeholders)
tests/check.mjs       Playwright checks
docs/                 research, plan, prompts, process log
production/raw/       raw clips from Magnific (not committed)
```

## Run it locally

You need Node.js and ffmpeg.

```
npm install
npx serve .
```

## Rebuild the video

1. Put the clips in `production/raw/` as `s1.mp4 t1.mp4 s2.mp4 t2.mp4 s3.mp4 t3.mp4 s4.mp4`.
2. Check the seams: `npm run seams -- production/raw/s1.mp4 production/raw/t1.mp4 production/raw/s2.mp4`
3. Build: `npm run build:video`
4. Test: `npm test` (screenshots go to `test-results/`)

## Tools and credits

- Images and video: Magnific MCP (Seedance 2.5).
- Based on ideas from [oso95/scroll-world](https://github.com/oso95/scroll-world) (seam method, blob seeking). The engine here is my own, simpler version that scrubs one joined video.
- AI (Claude) helped with research, code, prompts and testing. Concept, art direction and final decisions are mine.
