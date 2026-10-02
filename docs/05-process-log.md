# 05 - Process log

Short notes on decisions, tests and changes. One entry per working session.

| Date | What I did | Result | Decision / change |
|---|---|---|---|
| 2026-10-02 | Studied scroll-world repo + 5 scroll sites. Chose subject: MADATSU "sell your cards". | Concept, visual direction and technical plan written. | One card as the thread of the story. Realistic style, forward-only camera. One joined video instead of separate clips. |
| 2026-10-02 | Built the page and scrub engine with placeholder clips. | Scroll forward/backward works, text panels, rail, CTA, reduced motion. | Placeholders will be replaced by the Magnific clips. |
| 2026-10-02 | Connected Magnific MCP. First login was a personal free account (0 credits, video locked), switched to the school account. | Seedance 2.5 available up to 1080p. | Final clips at 1080p instead of 720p (planned), cost is still small. |
| 2026-10-02 | Stills round 1 with Nano Banana 2, 2 variants each. Still 1 used as style reference for 2-4. | 1A and 2A approved. 3 and 4 showed real Pokémon boxes and cards in the background. | Rejected 3A/3B/4A/4B (other brands' IP, readable text). Re-rolled with "plain unbranded boxes" and "abstract foil only". Picked 3C and 4C. 2B rejected because of fake text on the toploader. |
| 2026-10-02 | Test S1 -> T1 -> S2 at 480p (Step 2). | Both seams match in composition: same card position, same light. Raw SSIM was low (0.55) only because of film grain. | Changed `seams.mjs` to blur + downscale before SSIM (now 0.83 / 0.92). Workflow approved, no prompt changes needed for T1. |
| 2026-10-02 | Final S1-S4 at 1080p, then T1-T3 at 1080p with keyframes from the real 1080p frames. | All 6 seams SSIM 0.985-0.994. T2 reads as a gentle crane-up, T3 lets the card float up onto the stand (short morph, fits the "magic" of the moment). | Kept all clips, no re-rolls needed. Joined into one 34 s film. |
| 2026-10-02 | Encoded 1920 / 1280 / 854 versions (MP4 + WebM). Playwright checks. | 16/16 checks pass. | Big screens get 1080p (18 MB), laptops 720p, phones 480p. Fixed the scroll hint overlapping the text panel on phones. |

## Images

- Approved stills: `img/still-1.jpg` ... `img/still-4.jpg`
- Rejected first round (Pokémon IP and fake text visible): `img/stills-rejected-3-4.jpg`
- Re-roll round: `img/stills-reroll-3-4.jpg`
- Test transition at 480p: `img/test-t1-480p.jpg`
- Final transitions: `img/transitions-1080p.jpg`
- Seam checks: `img/seam-t1-s2.jpg`, `img/seam-t3-s4.jpg`
