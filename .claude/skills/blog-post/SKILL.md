---
name: blog-post
description: Write a new blog post for jesseguenzl.com in Jesse's voice, usually a project write-up from a source repo and some notes. Use when asked to add, draft, or write a blog entry or post, or to write up a project for the blog.
---

# Blog post

A post is one markdown file in `src/content/blog/<slug>.md`. There is no CMS: the file is the
post, the build is the proofreader, and a push to `main` deploys it. The skill has two halves:
getting the facts right (the pipeline below) and getting the voice right (`references/voice.md`,
read it before drafting, every time).

## 1. Gather

Jesse points at a source repo, a URL, a README, notes, a video, or some combination. Read enough
to describe the thing honestly:

- README, commit log (`git log --reverse --format='%ad %s' --date=short`), the main entry
  point, and whatever the README name-drops. Skim for the *decisions*: the parts list, the
  constraints (budget, deadline, hardware), the thing that was harder than expected.
- Note concrete facts as you go: part names, numbers, versions, sizes, timings. These are the
  raw material; the post lives on them.
- Pull existing site context: `src/data/projects.ts` (is the project already listed? reuse its
  links and tags), and the tags already in use (`grep -h '^tags' src/content/blog/*.md`).

Then, once, ask the questions the code cannot answer. Batch them into a single message:

- What went wrong, or surprised you? (The best paragraph in any write-up.)
- What would you do differently?
- Context: when, for what (course, job, weekend), with whom, on what budget?
- Is there a photo or video, and can the reader try it?
- Anything you want left out?

Don't block on the answers: draft with `<!-- TODO: confirm ... -->` markers where a fact is
missing and fill them in afterwards. Never invent an anecdote, a number, or a motive.

## 2. Frontmatter

The schema is in `src/content.config.ts`; a wrong field fails the build.

```yaml
---
title: 'Sentence case, no trailing period'
description: 'One sentence. Shows on /blog/, in RSS, and as the meta description.'
pubDate: 2026-09-03
tags: ['embedded', 'c']
---
```

- **Slug** is the filename and the URL (`/blog/<slug>/`): lowercase kebab-case, the project
  name or the topic, no dates.
- **Title** is sentence case, as the existing posts are (`Hello, world`, `The page is a room`).
  Short and literal beats clever. No colon-subtitles.
- **Description** is one plain sentence under ~140 characters, stating what the post is about.
  Not a teaser, not a question.
- **pubDate** is today unless told otherwise. ISO date, no time.
- **tags** are lowercase, 2–4 of them, reusing existing tags where one fits. Technology names
  keep their casing convention (`three.js`, `c`, `rust`).
- Never set `doom: true`. That flag belongs to exactly one post.

## 3. Body

Read `references/voice.md` first. The structural rules:

- Headings are `##` (the title is the `h1`) and short noun phrases: `The idea`, `Parts`,
  `What broke`. No heading for an introduction; the post just starts.
- Open with the situation in one paragraph: where, when, what for, what the constraint was.
  Then the idea, then how it was built, then what went wrong, then where it stands. Reorder if
  the story wants it; drop sections that would be padding.
- Prose paragraphs of 3–6 sentences. Lists only for things that are actually lists (a parts
  list, a spec, the steps of a protocol). Never a list of one-line paragraphs in disguise.
- Code only when the code is the point: the tricky bit, the workaround, the config that
  matters. Keep blocks under ~15 lines, use a language tag, and say which file it is from.
  Shiki renders it with the site's dark theme.
- Link generously and specifically: the repo, the datasheet, the library, the blog post that
  explained the bug. Link text is the thing's name, never "here".
- Length: 600–1500 words for a project write-up. If the source is thin, write the shorter
  post rather than padding it.
- Images go in `public/images/blog/<slug>/`, referenced as
  `![alt text](/images/blog/<slug>/name.avif)`. Convert to AVIF or WebP like the rest of
  `public/images/`; keep each under ~200 KB. Alt text describes the picture, not the caption.
  **Caveat:** `.prose` in `src/styles/global.css` has no `img`/`figure` rules yet. The first
  post with an image needs one added in the same change, following the flat-surface convention
  (1px `--color-edge` border, 2px radius, no shadow, `max-width: 100%`).
- Markdown only: no raw HTML, no MDX, no components. The one `<span>` in the doom post is
  the exception, not a precedent.

## 4. Cross-link

If the project has an entry in `src/data/projects.ts`, add
`{ label: 'Write-up', href: '/blog/<slug>/' }` to its `links` so the homepage points at the
post. Put it first if the project has no live demo, otherwise after the demo link.

## 5. Verify

```bash
npm run check && npm run build
ls dist/blog/<slug>/index.html
grep -c "<slug>" dist/rss.xml   # expect 1
```

Then read the rendered post once at `http://localhost:4321/blog/<slug>/` (`npm run dev`) or in
the built HTML: check headings render at the right level, code blocks highlight, links resolve,
and no `TODO` marker survived. Read the description on `/blog/` too; it is the only line most
readers see.

## 6. Hand over

Leave the post uncommitted and say so. Pushing to `main` deploys, so the commit is Jesse's
call. Summarise what facts came from the source, what came from Jesse's answers, and what is
still marked to confirm. If the writing had to guess at a motive or a feeling, name the
sentence so it can be struck.
