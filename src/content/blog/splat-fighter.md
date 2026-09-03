---
title: 'Splat Fighter'
description: 'A browser fighting game whose arenas are Gaussian splat scans of real rooms, and what it took to build it in nine days.'
pubDate: 2026-09-03
tags: ['three.js', 'gaussian splatting', 'netcode', 'typescript']
---

My friends and I were really into Tekken for a while, and we always played it in the same
friend's dorm room. At some point the obvious idea came up: turn his room into the arena,
and let us break his furniture in it. A Gaussian splat can capture a room from a phone
video, so the question was whether a splat could be a fighting game arena. Not a background
image, the actual room: two fighters standing on its floor, half hidden behind its
furniture, with the camera swinging around them when one of them sidesteps. The constraints
I set myself were that it had to run in a normal browser at 60 fps, and that the room could
be anything somebody films with their phone.

![Two fighters squaring up on the paving of a garden courtyard, a blue door and ivy behind them and a tree trunk between](/images/blog/splat-fighter/garden-match.avif)

## The idea

The game is a 2.5D fighter in the Tekken sense. Both fighters stand on a line, all the
combat math is one-dimensional, and a tap up or down sidesteps around the opponent, which
turns the line and the camera with it. The arena is a splat of a real place. You film a room,
upload the video, and a GPU box turns it into an arena you can fight in and share with
others. The furniture the pipeline recognises becomes props you can pick up and throw. And
because a splat of a room is not much use without a fighter who fits into it, a few photos
of a person can be turned into a rigged character as well.

That is the version that exists now. On day one the question was much smaller.

## Does it even render

The first commit is a spike: load a raw, uncleaned 257 MB indoor scan (from
[kishimisu's WebGL splat viewer](https://github.com/kishimisu/3d-gaussian-splatting-webgl))
into [Spark](https://sparkjs.dev/) on a three.js `WebGLRenderer`, put two animated skinned
characters into it, and measure. The gate I had written down was a p99 frame time of 20 ms
with no long frames at all. It came in at 9.4 ms, on the worst asset the game would ever
see. The real risk was depth compositing, whether a skinned mesh standing behind a foreground
splat would actually be occluded by it, and that just worked. I had planned to compare a
second renderer and skipped it, because a second integration would have bought no
information the decision needed.

Spark has two traps worth writing down. A `SparkRenderer` node has to be added to the scene,
otherwise every splat mesh loads successfully and renders nothing. And on a high-DPI display
the canvas was laid out at buffer size, so you saw the top left quarter of the frame, which
looked exactly like the camera zooming in on player one. That one is three.js, not Spark:
`renderer.setSize(w, h, false)` skips the CSS size. The fix is deleting the `false`.

## The simulation

The combat core is a pure function. `tick(state, inputs, config)` takes plain data and
returns plain data, at 60 Hz, with a seeded PRNG in the state and no access to the renderer,
the DOM, `Math.random` or `Date.now`. An ESLint rule enforces the import wall, and a test
replays every match twice and compares the states. A tick costs 3.3 µs and the state is
682 bytes, which is small enough that the pure-function discipline never had to be
compromised for speed.

All frame data lives in a `moves.json` per fighter, validated by a zod schema: startup,
active and recovery frames, hitboxes as rectangles in fight-plane coordinates, damage, stun,
and the string graph of follow-ups. Each fighter has 19 moves. No rule in the sim is keyed on
a move id, not even the CPU opponent's, which chooses by properties like "is a low" or "is
plus on block" and therefore inherits every balance change without being told. The schema
refuses to parse a moveset with an unreachable follow-up or a cycle in the string graph,
since a cycle is the one infinite combo the juggle cap cannot bound.

## Netcode

Rollback netcode is the reason the sim was built that way, and once the sim is pure, rollback
is just a driver. The loop keeps a ring of the states `tick()` returned, schedules local input
three ticks out, predicts the remote player by repeating their last frame, and rewinds and
resimulates when a packet proves the prediction wrong. Past 15 ticks of rollback it stops and
drops wall-clock time rather than banking it into a burst. Input packets go over a WebRTC data
channel as 20 to 50 binary bytes that resend the whole unacknowledged window, so any single
arrival heals all the loss before it. Matches are found through room codes on the API, which
keeps the rooms in a `Map` in the API process, so the platform is single-instance while online
play is on. That was a fine trade for a game with one instance.

The bug that cost the most time there was an ordering one. SDP and ICE candidates can arrive
before this side's `RTCPeerConnection` exists, because an offer can beat the TURN credential
fetch. Drop them and both peers wait forever in a lobby that looks perfectly healthy. Queue
them and everything works.

## From a phone video to an arena

The reconstruction pipeline runs on a GPU server and shells out step by step. ffmpeg picks the sharpest frame in each window at a few frames
per second. [COLMAP 4](https://colmap.github.io/) solves the camera poses with its global
mapper, falling back to the incremental one when too few frames register, and a gate rejects
pan-only captures with no parallax before anything is trained. Nerfstudio's `splatfacto` does
the actual splatting, and `splat-transform` crops and compresses the result. It has to emit
`.compressed.ply` rather than SPZ, because Spark reads SPZ versions 1 to 3 and
`splat-transform` writes version 4. One capture takes about an hour end to end.

Then the room is taken apart. [SAM 3](https://github.com/facebookresearch/sam3) runs in its
own container over the extracted frames and produces masks per concept, "chair" rather than
"this chair". The masks are lifted to per-gaussian labels by computing FlashSplat's objective
as a gsplat autograd gradient, which needs no custom CUDA and comes with a test that proves
the identity. A concept is then split into props by 3D connected components, so two chairs
standing apart become `chair_01` and `chair_02`, and two chairs touching become one wide
chair. Every prop is a suggestion until a human accepts it in the arena editor.

What is not built is background inpainting. The scene is the room minus its props, so a prop
that gets thrown reveals the hole it was cut from. Props are still fun to throw, and the hole
is behind the person you threw it at.


The pipeline's best bug was that every reconstructed room stood on its side. The floor
estimator assumed captures come out y-down, which is true of the sample scans, and false of
`ns-export`, which writes gaussians in nerfstudio's dataparser space with up on +z. Now up is
estimated rather than assumed: the worker reads gravity out of the camera poses, and a RANSAC
pass fits the dominant floor sheet and folds the residual tilt into the arena transform. On
the real capture the result lands 1.3° from the hand-tuned arena, down from 27.8°.

## Fighters from photos

A custom fighter is a skin. A few photos go through a background matte,
[Hunyuan3D](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) for the mesh and textures, a
Blender cleanup, and then the canonical Mixamo armature is transplanted onto the mesh. The
GLB carries no animations of its own. Clips are borrowed at load time from the base fighter
and bound by bone name, and the moveset is the base fighter's by object identity, so the sim,
the replays and the netcode cannot tell a custom fighter from its base. That is the whole
reason the feature was cheap.

Every generation job died at 301 seconds. The two-hour timeout in the config looked
innocent, but Node's `fetch` enforces a 300 second headers timeout of its own, independently
of any `AbortSignal`, and the sidecar sends no headers until the whole pipeline is done,
which takes about 314 seconds. I measured it rather than reasoned about it: a 310 second
request dies at 301, a 4 second one does not. The worker then deleted the shared work
directory while the sidecar was still writing into it, so the error that actually surfaced
was a missing `matted/front.png`, minutes downstream of the real failure, and the partial
work a retry could have reused was gone with it.

## Numbers

| | |
|---|---|
| Calendar time | 9 days, 24 July to 1 August |
| Commits | 96 |
| TypeScript and Python | ~31,000 lines |
| Tests | ~14,000 lines |
| Documentation | ~9,000 lines |
| p99 frame time on the raw scan | 9.4 ms |
| One tick of the sim | 3.3 µs |

Most of the code was written together with Claude Code. The architecture docs, the
adversarial review passes in the commit log and the test volume are what that looks like when
it goes well; the 301 second timeout is what it looks like when it does not.

## Where it stands

The game is live at [splat-fighter.jesseguenzl.com](https://splat-fighter.jesseguenzl.com).
Local matches and the built-in arenas work without an account. Uploading a room or a fighter
needs one, and signups wait for approval, because every upload is an hour of GPU time and a
video of somebody's living room. Desktop only: the game needs a keyboard or a gamepad, and a
phone gets a screen saying so.

Still open: the inpainting, custom fighters in online matches (a guest assembles its own
game config and cannot resolve the host's fighter yet), and capping the splat count during
training so a large room does not produce an unpredictably large asset. None of them are
blocking anybody from throwing a chair.
