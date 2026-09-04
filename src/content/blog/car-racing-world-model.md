---
title: 'Two world models for CarRacing'
description: 'For my bachelor thesis a GRU and a Transformer learned to dream CarRacing-v3, and a PPO agent tried to learn to drive in the dream.'
pubDate: 2026-08-20
tags: ['reinforcement learning', 'pytorch', 'thesis']
---

My bachelor thesis at HAW Hamburg (Department Medientechnik, handed in November 2025) grew
out of reading the [DreamerV3](https://arxiv.org/abs/2301.04104) paper. Dreamer trains an
agent almost entirely inside a learned model of its environment, a world model, and I wanted
to build one myself. I also wanted to use a Transformer for it, because that was the
architecture everybody was talking about, and Dreamer uses a GRU. So the thesis became a
comparison: the same pipeline with a GRU world model and with a Transformer world model,
both trained on [CarRacing-v3](https://gymnasium.farama.org/environments/box2d/car_racing/)
from Gymnasium, and the question whether a PPO agent learns to drive faster when most of its
practice happens in the dream. The code is on
[GitHub](https://github.com/Emtrixx/car-racing-world-model).

![Four consecutive frames dreamed by the GRU world model: a grey road curving through green grass with a red car at the bottom of each frame, and red and white kerbs along the bend](/images/blog/car-racing-world-model/dream-gru.avif)

## The pipeline

CarRacing gives you a 96x96 top-down RGB frame of a randomly generated track and takes
steering, gas and brake as continuous actions. I crop the HUD off the bottom, resize to
64x64, skip the first 50 frames (the game starts with a zoom animation) and only look at
every fourth frame after that. A VQ-VAE compresses each frame into a 4x4 grid of tokens
from a codebook of 512 entries, so one game state is 16 integers. The world models only
ever see those tokens. Given the history of token grids and actions, they predict the 16
tokens of the next frame plus a reward and a done flag, and the VQ-VAE decoder turns
predicted tokens back into pictures, which is what the frames above are.

The agent is the PPO from [Stable Baselines3](https://stable-baselines3.readthedocs.io/)
with a small Impala-style CNN, looking at a stack of four frames, real ones or decoded dream
ones. Training follows Sutton's Dyna idea: collect some real experience, train the world
model on it, train the agent inside the world model, repeat. All of it ran in Docker on a
university server with A100s. The final models are about the same size, 40.0 million
parameters for the GRU and 42.6 million for the Transformer, so the comparison is at least
fair on that axis.

## A codebook of 512, five in use

The VQ-VAE cost the most calendar time by far. The reconstructions looked fine, the world
model did not, and it took a while to notice that only about five of the 512 codebook
entries were ever used. Doubling the codebook did not change that, the same five entries
were used again. With five codes every frame decodes to the same blurry vertical road with
a car at the bottom.

![Eight original CarRacing frames with different curves above eight reconstructions that all show the same blurry vertical road with a car at the bottom](/images/blog/car-racing-world-model/vqvae-collapse.avif)

The cause is that CarRacing frames all look alike, so a plain pixel loss finds a local
minimum where one average frame is close enough to all of them. No single change fixed it.
What did was the combination of a perceptual loss
([LPIPS](https://github.com/richzhang/PerceptualSimilarity)) next to the pixel loss,
initialising the codebook with k-means over encoder outputs, resetting codes that go unused
during training, updating the codebook by exponential moving average instead of a loss
term, and a much lower commitment cost, which I should have tried weeks earlier. After that
almost every code was in use and the projection of the codebook looked like an even cloud
instead of a cloud with an island. You can poke at the result in the
[VQ-VAE explorer](https://vqvae.jesseguenzl.com/), which shows the codebook in 2D and which
16 entries a given frame uses.

## Making the GRU predict

The Transformer was the easy half. It takes a history of token grids and actions as memory,
has 16 learnable query tokens for the next grid plus one global token whose output feeds the
reward and done heads, and predicts all 16 tokens in parallel with block teacher forcing,
so training is one batched forward pass. It worked more or less from the first version.

The GRU went through three architectures. The first generated the 16 tokens of a frame one
after another, each conditioned on the previous token and the hidden state, with
hand-written GRU cells in a Python loop. That loop meant many small CUDA calls per step, and
the GPU sat mostly idle. It also had exposure bias: trained only on ground-truth tokens, it
fell apart as soon as it had to consume its own predictions. Scheduled sampling helped,
meaning the model was gradually fed its own outputs after the first 10k steps, and the
validation loss (always measured without teacher forcing) only started falling at that
point. The second architecture split the job in two, an outer GRU for time and an inner GRU
for the 16 tokens of one frame. Cleaner on paper, still slow, still worse than the
Transformer.

The third version went back towards Dreamer. One PyTorch GRU with three layers and a
hidden size of 1024 takes the embedded previous frame and action, a small network samples a
stochastic state from the hidden state, and the two together predict all 16 tokens at once.
No token loop, no custom cells, one optimised kernel. That turned out to be the whole trick.
The GRU now converges faster than the Transformer and reaches a lower validation token
loss, 1.06 against 2.14 on the same expert dataset.

![Validation token loss over training steps for both world models, the GRU in orange falling to about 1.1 and the Transformer in blue flattening out at about 2.1](/images/blog/car-racing-world-model/token-loss.avif)

My reading is that CarRacing does not reward long memory. What happens next depends on
speed and the bend you can already see, and the attention maps agree: several
cross-attention heads put almost all their weight on the most recent frames in the memory.
Some self-attention heads learned a clean spatial rule, for example attending to the token
directly above the one being predicted. The GRU's recurrent state is a compressed version of
exactly that local context, and a probe trained on it could read off the distance to the
next turn with 67.9 percent accuracy. The labels for that probe came from Gemma 3 looking at
frames through Ollama, and they were noisy enough that I stopped there rather than label a
few thousand frames by hand.

## Things that failed quietly

The training runs that just stopped were worse than the ones that crashed. One night of
debugging ended at a single line in the compose file, `shm_size: '4gb'`. The DataLoader
workers pass batches through shared memory, Docker's default was too small for the dataset,
and instead of an error the process died without a word. Another one was episode boundaries:
a training sequence could run from the end of one episode into the start of the next, and
the model was asked to predict a fresh track from the last frame of an old one. Then there
was the evaluation callback that still normalised rewards, discovered after the first full
set of experiments, which is how I got to run them all twice.

## Driving in the dream

Both world models can be played. A script primes the model with a real frame and then feeds
it your keyboard input, and a small FastAPI server does the same over a WebSocket so the
dream runs in a browser. The first thing you notice is that the car keeps driving when you
press nothing, because the model was trained only on an expert agent that never stands
still. The dream is a copy of that agent's habits as much as of the game.

![Four late frames from the same dream: the road has dissolved into a green field with a small grey bump under the car, and a black blob spreads in from the top right of the last frame](/images/blog/car-racing-world-model/dream-drift.avif)

Left alone for a few hundred frames the dream also drifts. Errors in the predicted tokens
compound, the road melts into the grass, and eventually a black region grows in from one
corner.

## Does the agent learn faster

That was the actual question, and the answer is no, not in this setup. I compared five
configurations with the [rliable](https://github.com/google-research/rliable) protocol,
ten seeds each where I could afford it: a model-free PPO baseline, two Dream agents trained
only inside a world model that was pre-trained on 1,000,000 expert transitions, and two Dyna
agents where the agent and the world model start from scratch together, with 24 dreamed
steps for every real one after a warm-up of a million real steps.

![Sample efficiency curves for the five agent configurations over two million timesteps. The model-free PPO climbs to about 500 and falls back to 200, the Dyna Transformer spikes to 350 and collapses, and the Dream and Dyna GRU agents stay near zero](/images/blog/car-racing-world-model/agents.avif)

| Agent | IQM episode reward |
|---|---|
| Model-free PPO | 169.96 |
| Dream GRU | -18.81 |
| Dream Transformer | -73.97 |
| Dyna GRU | -3.11 |
| Dyna Transformer | -42.91 |

The Dyna agents show the bootstrap problem in its purest form. An untrained agent produces
data that is mostly dithering, the world model trained on it is wrong, and the agent trained
in that wrong world does not improve, so the data stays bad. One Dyna run learned to drive a
bit during the real-only warm-up and collapsed as soon as dreaming started. The Dream agents
had the best world models I could make and still never got positive reward: the models are
trained on one expert's trajectories, the learner immediately leaves that distribution, and
small errors in every predicted frame add up over a rollout. The model-free agent is
grounded in the real game at every step and simply wins. The Dyna numbers are single runs
stopped at 1.5 million real steps, so they are case studies rather than statistics.

## Where it stands

The GRU beat the Transformer on this task, which is the Dreamer result and not what I was
betting on when the Transformer was the end goal. The thesis has a list of what I would
change first: mix random and scripted driving into the world model dataset so the dream has
seen a car stand still, weight the reward loss so it is not drowned out by the 16 token
losses, and try a state space model as the third architecture. While drawing diagrams for
the defense in January I also found that the Transformer's self-attention mask let each
step's queries attend to the queries of earlier steps, when they should only have seen their
own. It is fixed in the repository now, and the numbers above were produced with the old
mask. The thesis was defended at the end of January 2026 and still got a 1,0.
