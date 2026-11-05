# Learn Spanish

A static Spanish reading site built with Astro. Stories are JSON files with Spanish/English gloss groups. The site inserts one space between groups; select a group in a story to reveal its meaning.

## Requirements

- Bun

## Local development

```sh
bun install
bun run dev
```

## Add a story

1. Use the template and writing rules in [`prompts/story-generation.md`](./prompts/story-generation.md).
2. Save the story as `content/stories/<slug>.json`.
3. Use a top-level `title`, a CEFR level (`A1` through `C2`), and an ordered `groups` array. Every group must have non-empty `spanish` and `english` strings. Keep each Spanish group to four words or fewer; the site inserts one space between groups.
4. Run checks and build before committing:

```sh
bun run check
bun run test
bun run build
```

Story source files stay in `content/stories` and are not copied into the published site.

## Deployment

The project is configured for Vercel to install with Bun and run `bun run build`. Astro writes the static site to `dist`.
