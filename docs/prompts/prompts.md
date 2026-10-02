# Prompts

Keep the **style block** exactly the same in every still prompt. That shared text is what makes the four scenes look like one world.

## Style block (stills)

```
Photorealistic cinematic product photography, 16:9 widescreen frame. Low camera height,
35mm lens, shallow depth of field, soft film grain. Dark navy surroundings (#13213F, #0A1020)
lit by one warm practical light source (#F0A94B), gentle falloff into shadow, subtle teal
reflections (#8FD6CF) on holographic foil and clear plastic. Quiet, careful, nighttime
collector mood. Main subject centered with headroom. No people, no hands. Absolutely no
readable text, no letters, no numbers, no logos; trading card artwork is abstract and
out of focus.
```

## Scene stills

Model: GPT 2.5 or Nano Banana 2 (pick ONE for all four). 16:9, 2K.
Generate scene 1 first. When it is approved, pass it as a style reference for scenes 2-4.

### Still 1 - The drawer

```
[STYLE BLOCK]
Subject: an open wooden desk drawer seen from slightly above, inside it a worn cardboard
shoebox full of loose trading cards with dark blue patterned backs, a few rubber bands and
old penny sleeves. One card lies face-up on top in the center, its holographic foil catching
the warm light of a desk lamp just outside the frame. Bedroom desk at evening, wood grain,
dust in the light beam.
```

### Still 2 - The check

```
[STYLE BLOCK]
Subject: a single trading card inside a clear rigid toploader lying in the center of a dark
navy felt playmat, a small jeweler's loupe next to it, a warm desk lamp pool of light. In
the background, out of focus, a neat row of cards in penny sleeves and a closed card binder.
Calm, precise, inspection mood.
```

### Still 3 - The offer

```
[STYLE BLOCK]
Subject: the same trading card in a clear toploader lying on a dark wooden shop counter
with a navy felt mat. Behind it, deep out of focus, shelves of sealed trading card booster
boxes and binders in a small cosy card shop, warm pendant lights making soft bokeh circles.
```

### Still 4 - The display

```
[STYLE BLOCK]
Subject: the same trading card in a clear toploader standing upright on a small clear
acrylic stand inside a glass display case, thin warm LED strip light along the top edge,
other cards on stands to the left and right slightly out of focus, reflections in the glass,
dark navy shop interior behind. Proud, finished, gallery-like.
```

## Scene clips (I2V, start frame = still)

Seedance 2.5, 16:9, 5 s, start frame only. 480p for tests, 720p for final.

Shared motion rules (keep in every video prompt):

```
Single continuous shot, no cuts. Slow, steady forward camera drift at constant speed.
Photorealistic, same lens and color grade as the start frame. No people, no hands,
no text appearing. Smooth, calm, slow motion.
```

### Clip S1 - The drawer

```
[MOTION RULES]
The camera slowly pushes forward and slightly down over the shoebox toward the face-up
holographic card in the center. Light shimmers across the foil. End with the card larger
in frame, camera still drifting forward.
```

### Clip S2 - The check

```
[MOTION RULES]
The camera slowly pushes forward toward the card in the toploader on the navy felt, the
loupe passes by in the foreground with gentle parallax. End with the camera still drifting
forward, low over the felt.
```

### Clip S3 - The offer

```
[MOTION RULES]
The camera slowly pushes forward toward the card on the counter, the shop shelves behind
it shift gently in parallax, bokeh lights shimmer. End still drifting forward past the card.
```

### Clip S4 - The display

```
[MOTION RULES]
The camera slowly glides forward toward the glass display case and settles in front of
the card on its acrylic stand. LED light reflects softly on the glass. Very slow, final,
calm ending.
```

## Transitions (keyframes: start AND end frame)

Start frame = the ACTUAL last frame of the previous scene clip.
End frame = the ACTUAL first frame of the next scene clip.
(Extract both with `node tools/frames.mjs`. Never use the original stills here.)

5 s, 16:9, same resolution as the scene clips.

### T1 - Drawer to desk

```
[MOTION RULES]
Continuing the same forward drift, the camera follows the holographic card as it lifts out
of the shoebox and slides into a clear rigid toploader. The wooden drawer and cardboard fade
away into dark navy felt and a warm lamp pool of light. One continuous camera move, no cut.
```

### T2 - Desk to counter

```
[MOTION RULES]
Continuing the same forward drift, the camera tracks low and level along the navy felt
following the card in its toploader. The space opens up as the felt becomes a shop counter
and shelves of card boxes appear softly out of focus with warm bokeh lights.
```

### T3 - Counter to display

```
[MOTION RULES]
Continuing the same forward drift, the camera moves past the counter toward a lit glass
display case. The card in its toploader now stands on a small acrylic stand inside the case,
thin warm LED light along the top. One continuous camera move, no cut.
```

## If moderation blocks a clip

1. Re-roll once with the same prompt.
2. Add: "empty room, no people, product photography, tasteful".
3. Remove words like "night", "bedroom" (try "evening study desk").
