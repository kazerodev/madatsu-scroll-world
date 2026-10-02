# 04 - Magnific workflow (adapted from the Higgsfield skill)

## Setup

1. claude.ai -> profile menu -> Customize -> Connectors -> Add connector -> Add custom connector.
2. Name: `Magnific`, URL: `https://mcp.magnific.com`.
3. Sign in with the school Magnific account (OAuth window).
4. In a new Claude chat, check the tools are there: `account_balance`, `images_models_list`, `video_models_list`, `video_models_show`, `simulate_cost`, `images_generate`, `video_generate`, `creations_wait`, `creations_get`, `creations_register_download`, `creations_request_upload`, `creations_finalize_upload`.

## What changes compared to the reference skill

| Reference (Higgsfield / Monid) | This project (Magnific MCP) |
|---|---|
| `higgsfield generate create gpt_image_2 ...` | `images_generate` with GPT 2.5 or Nano Banana 2 |
| `--start-image` / `--end-image` local paths | Seedance 2.5 keyframes: `start` / `end` frame. Local frames are uploaded first with `creations_request_upload` -> PUT -> `creations_finalize_upload` |
| Monid `sfs` URLs for frames | Magnific creation identifiers / URLs |
| Seedance 2.0 at 1080p | Seedance 2.5 (`bytedance-seedance-pro-2.5`) at 480p / 720p |
| Credits checked by diffing the balance | `simulate_cost` before every batch, `account_balance` before spending |
| Poll with `--wait` | `creations_wait` (long-poll), then `creations_register_download` and download the asset URL |
| Clips switched in the page with DOM crossfades | All clips joined with ffmpeg into one timeline (`tools/build-video.mjs`) |

Checked live on 2026-10-02 with `video_models_list` and `simulate_cost` (school Business account):

- Seedance 2.5 (`bytedance-seedance-pro-2.5`): 4-30 s, 480p / 720p / 1080p, start + end keyframes supported.
- Image model used: Nano Banana 2 (`imagen-nano-banana-2-flash`), 2K, 16:9. GPT 2.5 is listed as best for text/layout, not photoreal, so I chose Nano Banana 2.
- Exact costs: image 2K = 75 credits. Seedance 2.5, 5 s: 480p = 1,000 / 720p = 2,200 / 1080p = 3,950 credits.

Known limits:

- Keyframes (start/end) and references can NOT be combined in one Seedance job. For transitions I use keyframes only.
- Seedance lands close to the end frame but not pixel-perfect. The 4-frame crossfade in the join covers the small difference.

## Cost (estimate, verify with `simulate_cost`)

| Batch | Content | Credits |
|---|---|---|
| Stills | 14 images (4 kept, 2 rounds of re-rolls) | 1,050 |
| Test (Step 2 of the brief) | S1 + T1 + S2 at 480p, 3 x 5 s | 3,000 |
| Final | 4 scenes + 3 transitions at 1080p, 7 x 5 s | 27,650 |
| Total | | ~31,700 |

Credits are shared with the class: no batch runs without checking the estimate first.

## The test transition (do this first)

1. Generate Still 1 and Still 2. Check they look like one world (same lens, light, grade).
2. Generate S1 and S2 at 480p (I2V, start = still).
3. Download both into `production/raw/` as `s1.mp4` and `s2.mp4`.
4. Extract the seam frames:
   ```
   node tools/frames.mjs production/raw/s1.mp4 production/raw/s2.mp4
   ```
   -> `production/frames/s1_last.png` and `production/frames/s2_first.png`
5. Upload both frames to Magnific and generate T1 (keyframes start + end, 480p, 5 s).
6. Download as `production/raw/t1.mp4`.
7. Check the seams:
   ```
   node tools/seams.mjs production/raw/s1.mp4 production/raw/t1.mp4 production/raw/s2.mp4
   ```
   It prints a similarity score for each seam and saves side-by-side images in `production/frames/`.
8. Build a test page with only these 3 clips:
   ```
   node tools/build-video.mjs s1 t1 s2
   ```
   and scroll it. Look for pops, color jumps, camera reversing.
9. Fix the prompts (write what changed in `docs/05-process-log.md`) and only then generate the rest.

## Full run

1. Stills 3 and 4 (style reference = Still 1).
2. S3, S4 at 720p. Re-render S1, S2 at 720p.
3. Extract frames, generate T1, T2, T3 at 720p with keyframes.
4. `node tools/seams.mjs` on every seam.
5. `node tools/build-video.mjs s1 t1 s2 t2 s3 t3 s4`
6. The build script also saves `media/stills/poster.jpg` and `scene-1.jpg` ... `scene-4.jpg` (poster + reduced motion) from the joined video.
7. Test with `node tests/check.mjs`, commit, push.
