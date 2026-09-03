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
upload the video, and a GPU server turns it into an arena you can fight in and share with
others. The furniture the pipeline recognises becomes props you can pick up and throw. And
because a splat of a room is not much use without a fighter who fits into it, a few photos
of a person can be turned into a rigged character as well.

That is the version that exists now. On day one the question was much smaller.

## Does it even render

The first commit is a spike: load a raw, uncleaned 257 MB indoor scan into
[Spark](https://sparkjs.dev/) on three.js, put two animated skinned characters into it, and
measure. The gate I had written down was a p99 frame time of 20 ms with no long frames at
all. It came in at 9.4 ms, on the worst asset the game would ever see. The real risk was
depth: a splat is a cloud of translucent blobs sorted back to front, and I did not know
whether a skinned mesh standing behind a foreground splat would actually be hidden by it, or
float on top of everything like a sticker. It just worked. The meshes write depth and the
splats respect it, and the fighter half behind the tree in the screenshot above is the proof.

## The simulation

The combat core is a pure function. `tick(state, inputs, config)` takes plain data and
returns plain data at 60 Hz, with a seeded random generator inside the state and nothing
else. A tick costs 3.3 µs and the state is 682 bytes, and a test replays every match twice
and compares the results. All the frame data lives in a JSON file per fighter, and no rule
in the sim is keyed on a move's name, not even the CPU opponent's. It picks moves by
properties like "is a low" or "is plus on block", so every balance change I make to the
JSON changes how the CPU plays without anybody telling it. The one place that needed real
care was combo strings: a follow-up graph with a cycle in it is an infinite combo that no
juggle cap can bound, so the loader refuses to parse one.

## Netcode

Rollback netcode is the reason the sim was built that way. Once ticking is pure and the
state is 682 bytes, rollback is just a driver: keep a ring of past states, schedule your own
input three ticks into the future, predict the remote player by repeating their last input,
and when a packet arrives that proves the prediction wrong, rewind to that tick and
resimulate up to the present. Past 15 ticks it gives up and drops wall-clock time rather than
banking it into a burst. Inputs go over a WebRTC data channel between the two browsers, and
the server only does room codes and signaling.

The bug that cost the most time there was an ordering one. The signaling messages that set
up the peer connection can arrive before this side has created its `RTCPeerConnection`,
because the offer can beat the fetch for TURN credentials. Drop them and both players wait
forever in a lobby that looks perfectly healthy. Queue them and everything works. Two
browsers staring at each other with nothing wrong on either side is a very specific kind of
debugging.

## From a phone video to an arena

The reconstruction runs on a GPU server, one tool after the other: ffmpeg picks the sharpest
frames, [COLMAP](https://colmap.github.io/) solves the camera poses, nerfstudio trains the
splat, and a cleanup step crops and compresses it. One capture takes about an hour. A gate
after pose estimation rejects videos with no parallax before training starts, because a slow
pan from one spot gives COLMAP nothing to triangulate and would produce an hour of GPU time
and a puddle.

Then the room is taken apart. [SAM 3](https://github.com/facebookresearch/sam3) segments the
extracted frames per concept, "chair" rather than "this chair", and the masks are lifted onto
the individual gaussians. A concept is then split into props by 3D connected components, so
two chairs standing apart become `chair_01` and `chair_02`, and two chairs touching become
one wide chair. Every prop is a suggestion until a human accepts it in the arena editor.

What is not built is background inpainting. The scene is the room minus its props, so a prop
that gets thrown reveals the hole it was cut from. Props are still fun to throw, and the hole
is behind the person you threw it at.

The pipeline's best bug was that every reconstructed room stood on its side. The floor
estimator assumed captures come out with y pointing down, which is true of the sample scans
I started with, and false of nerfstudio's export, which puts up on +z. The floor plane ran
along a wall, and every room a user uploaded was tilted by 90 degrees with the floor
perpendicular to the ground. The fix was to stop assuming: the worker now reads gravity out
of the camera poses, then fits the dominant floor plane and folds the residual tilt into the
arena transform. On the real capture the result lands 1.3° from the arena I had tuned by
hand, down from 27.8°.

## Fighters from photos

A custom fighter is a skin. A few photos go through
[Hunyuan3D](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) for the mesh and textures, a
Blender cleanup, and then the base fighter's skeleton is transplanted onto the mesh. The
result carries no animations of its own. Clips are borrowed at load time from the base
fighter, and the moveset is the base fighter's, so the sim, the replays and the netcode
cannot tell a custom fighter from its base. That is the whole reason the feature was cheap.

Every generation job died at 301 seconds. The two-hour timeout in the config looked
innocent, but Node's `fetch` enforces a 300 second headers timeout of its own, independently
of any `AbortSignal`, and the generation service sends no headers until the whole pipeline
is done, which takes about 314 seconds. I measured it rather than reasoned about it: a
310 second request dies at 301, a 4 second one does not. The worker then deleted the shared
work directory while the service was still writing into it, so the error that actually
surfaced was a missing input image, minutes downstream of the real failure, and the partial
work a retry could have reused was gone with it.

## Numbers

| | |
|---|---|
| Calendar time | 9 days, 24 July to 1 August |
| Commits | 96 |
| TypeScript and Python | ~31,000 lines |
| Tests | ~14,000 lines |
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

Still open: the inpainting, custom fighters in online matches, and capping the splat count
during training so a large room does not produce an unpredictably large asset. None of them
are blocking anybody from throwing a chair.
