# Drawer to Display - MADATSU TCG

A scroll story for **MADATSU TCG**, my trading card shop in Mechelen. You follow one card from a forgotten drawer, through a check and an offer, to a lit display case. Scroll down and the camera moves forward, scroll up and it moves back.

The page is also a real landing page for our "sell us your cards" service. It ends with a WhatsApp offer form.

**Live website:** https://kazerodev.github.io/madatsu-scroll-world/

Thomas More, A2 Scroll World.

## How it works

- 4 scenes + 3 transitions, generated with Magnific MCP (stills with Nano Banana, video with Seedance 2.5 keyframes).
- Every transition starts on the actual last frame of the previous scene and ends on the actual first frame of the next one, so the seams are invisible.
- The hero card is a real One Piece card (Monkey.D.Luffy SP, OP05-119). Seedance refused to animate it, so I photographed the card and composited it onto the card in every clip myself: hand-marked corners on keyframes, dense optical flow tracking in between, then a perspective warp that keeps the light and reflections of the scene.
- All 7 clips are joined into one film with ffmpeg and turned into 823 WebP frames. The page draws them on a `<canvas>` while you scroll (image sequence, like Apple product pages), so scrolling is smooth in both directions.
- Frames are packed in 4 files per size and loaded in order (every 8th frame first, then 4th, 2nd, rest), so the page starts fast and gets sharper while it loads.
- Scenes get more scroll distance than transitions, so you stay a bit longer where the text is.
- Phones get lighter 854 px frames. People with "reduce motion" on get a static version with the 4 scene images.

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
js/config.js          contact info, frame paths, scroll pacing
js/main.js            scroll-to-frames engine + interface
media/frames/         frame sequence (1280 and 854 px)
media/stills/         poster and scene images
media/cards/          real card photo (OP05-119)
tools/                ffmpeg and OpenCV scripts (seams, build, card tracking and compositing)
tests/check.mjs       Playwright checks
docs/                 research, plan, prompts, process log
production/           raw clips and working files (not committed)
```

## Run it locally

You need Node.js and ffmpeg.

```
npm install
npx playwright install chromium
npx serve .
```

## Rebuild the video

1. Put the clips in `production/raw/` as `s1.mp4 t1.mp4 s2.mp4 t2.mp4 s3.mp4 t3.mp4 s4.mp4`.
2. Check the seams: `npm run seams -- production/raw/s1.mp4 production/raw/t1.mp4 production/raw/s2.mp4`
3. Real card (optional): from `production/`, run `python3 ../tools/card-pipeline.py` to track the card, then `tools/composite-card.py` per clip. Needs Python with OpenCV, NumPy and SciPy.
4. Build: `npm run build:video`
5. Test: `npm test` (screenshots go to `test-results/`)

## Tools and credits

- Images and video: Magnific MCP (Nano Banana, Seedance 2.5).
- Card photo: my own photo of a real card. One Piece Card Game is © Bandai / Eiichiro Oda, used with permission from the distributor for MADATSU TCG.
- Based on ideas from [oso95/scroll-world](https://github.com/oso95/scroll-world) (seam method, one joined film). The engine here is my own, simpler version that draws one frame sequence on a canvas.
- AI (Claude) helped with research, code, prompts and testing. Concept, art direction and final decisions are mine.
