# Jesse's voice

Read this before drafting. The goal is a post Jesse could have written on a good evening, not a
post that sounds like a model doing an impression of one.

## The sample

Written by Jesse, about the PicoMix project. Verbatim, typos included (they are not part of
the voice; fix them in your own drafts, but do not fix anything else).

> # Introduction
>
> When I was in Helsinki to study abroad for a semester I had an IoT Project course for the
> second period (the semesters are split into 2 periods in Finland). The programming should be
> done on a Raspberry Pico W that was supplied with an attached hat that included next to some
> connectors also a rotary encoder with a push button and a tiny OLED display.
>
> # The idea
>
> After some brainstorming with the team we decided that we wanted to create a cocktail mixing
> machine. It should be able to fill a cup with 2 liquids and pump them if possible at the same
> time and also precise enough to set your desired mix ratio in percent. Users should be able to
> first choose one of a selection of drinks, select a size and a ratio and then use an RFID card
> to authenticate and only be able to attain a drink if there are credits left on their account.
>
> Consequently, a web application was needed to manage your user account effectively and for
> showcasing your drink consumption statistics in an engaging visual format. Additionally, for
> administrators, this app should facilitate device maintenance by displaying the remaining
> liquid levels and providing the functionality to reset these values after refilling the
> containers.
>
> # Parts
>
> We had access to the a wide variety of microelectronic parts and also had a 50€ budget to
> spend on new ones. Because the goal was to built a demo we limited ourselves to a mixing
> machine with only 3 different kinds of liquids.
> Also because of some budget problems we did not get pumps or tubing that was specifically
> rated to be food safe. So drinking from the machine may come with some health risks but
> hopefully negligent in comparison to the alcohol that will be consumed.

The two posts already on the site (`src/content/blog/hello-world.md`, `the-page-is-a-room.md`)
are in the same register and are the second calibration point. `hello-world` is the closer
match for a project write-up.

## What makes it Jesse

**It is a story told in order.** Situation, idea, constraints, build. Past tense for what
happened, present tense for how the thing works. First person; "we" when there was a team,
without pretending the team was one person.

**Every sentence carries a fact.** Pico W, the hat, the rotary encoder, the OLED, the RFID
card, credits, 2 liquids, 3 kinds, 50€, two periods per semester. No sentence exists only to
set up the next one. When you catch yourself writing a transition sentence, delete it and see
if anything is lost.

**Context arrives in parentheses.** "(the semesters are split into 2 periods in Finland)". A
short aside for the reader who needs it, no footnote apparatus, no "for those unfamiliar".

**The humour is deadpan and lands at the end of a paragraph.** "hopefully negligible in
comparison to the alcohol that will be consumed." It is stated as a fact, in the same tone as
the facts around it, and it is at the expense of the project or the author, never the reader.
Never signposted, never followed by an exclamation mark, never in a heading. One per section is
plenty; zero is fine.

**The ambition is described plainly, including the parts that did not happen.** "if possible at
the same time". Requirements are listed as what they were meant to be, and the gap between plan
and result is where the honest paragraph lives.

**Sentences are plain and a little loose.** Compound sentences joined with "and" and "also" are
normal. No semicolons. Em dashes are rare (the sample has none; `hello-world` uses two). Prefer
a comma, a parenthesis, or a full stop.

**Vocabulary is literal.** "cocktail mixing machine", "tiny OLED display", "budget problems".
When the sample drifts into requirements-document English ("facilitate device maintenance",
"engaging visual format") that is the course report leaking in, not the voice. Translate that
register back into plain words.

## Do not

- Open with "In this post I will" or any statement of intent. The post starts with the story.
- Write a "Conclusion" or "Wrap-up" that summarises the post. End on the last concrete thing:
  what it does now, what is next, or the dry line.
- Thank the reader, invite comments, or add a call to action.
- Use marketing adjectives: powerful, seamless, robust, elegant, blazing, delightful.
- Use hedging filler: "essentially", "basically", "it's worth noting", "interestingly".
- Reach for a rule of three, a rhetorical question, or a punchline that announces itself.
- Bullet what should be a paragraph. Bullets are for parts lists and step sequences.
- Bold anything in the body. Emphasis is done by sentence position.
- Use emoji, "lol", "haha", or exclamation marks.
- Invent detail. A wrong part number reads worse than a `<!-- TODO -->`.

## Rewrites

Model prose on the left, the voice on the right.

| Model draft | In voice |
|---|---|
| In this post, I'll walk through how we built a cocktail machine on the Pico W. | For the second period of my semester in Helsinki I had an IoT project course, and the hardware was a Raspberry Pi Pico W on a hat with a rotary encoder and a small OLED. |
| The pumps weren't food-safe, which was a bit of a concern! 😅 | The pumps and tubing were not rated food safe. Drinking from the machine carries some risk, hopefully negligible next to the alcohol. |
| We leveraged FreeRTOS to achieve robust concurrent task handling. | The two pumps run from two FreeRTOS tasks so they can fill at the same time. |
| Interestingly, this turned out to be harder than expected. | The encoder bounced. Every turn registered as three, and the fix took an evening. |
| **Key takeaway:** always check your power budget. | The 5V rail sagged when both pumps started, which reset the Pico mid-pour. A second regulator fixed it. |

## Calibration from the wider web

The blogs that reliably do well with a technical audience and share this register:

- **Dan Luu** for density: real numbers, real measurements, the reader can check the maths.
- **Julia Evans** for the honest "here is what confused me, here is what I found out" arc.
- **Simon Willison** for linking to everything and quoting the actual command or config.
- **Fabien Sanglard** for dissecting a project by its constraints and showing the parts.
- **Rachel by the Bay** for the deadpan, one-fact-per-sentence delivery of a war story.

Borrow the habits, not the voices: the numbers, the links, the admitted mistakes, the refusal
to pad. The sentences stay Jesse's.
