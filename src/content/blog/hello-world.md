---
title: 'Hello, world'
description: 'This site has a blog now. A note on why, and how it is built.'
pubDate: 2026-07-28
tags: ['meta', 'astro']
---

This site has a blog now. Mostly because I keep solving small problems, forgetting the
solutions, and solving them again six months later. Writing them down here is cheaper
than the third solve.

## How it works

Each post is a markdown file in the repository. There is no CMS, no database, no admin
panel — publishing a post is a git commit. The site is built with
[Astro](https://astro.build), which turns the collection into static HTML at build time:

```ts
const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
  }),
});
```

That schema is the entire editorial workflow. If the frontmatter is wrong, the build
fails, which is exactly the kind of proofreading I can be trusted to do.

## What to expect

- Notes on web development, usually the kind of bug that costs an evening
- Some machine learning, since that is what I am studying
- No schedule, no newsletter, no comment section

> The palest ink is more reliable than the most retentive memory.

If something here is wrong, [tell me](mailto:contact@jesseguenzl.com) — that is what
the email address is for.
