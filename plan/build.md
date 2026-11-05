# Technical Build Plan

## Goal and constraints

Build a static Spanish-reading site with Astro and deploy it to Vercel. Each story has one unpublished JSON master copy containing ordered Spanish/English gloss groups. The site publishes the Spanish text, inserting one space between groups; selecting a group reveals its English meaning.

The site has no server-side runtime, database, external API, or LLM integration. Stories are authored and deployed through Git. A malformed story must fail the build rather than silently produce an incomplete page.

## Planned stack and packages

Use Bun for package management and local scripts, TypeScript for application code, Astro for static page generation, Tailwind CSS for layout and utility styling, and Sass for reader-specific styles.

| Package | Purpose |
| --- | --- |
| `astro` | Static site generator, file-based routes, and build tooling |
| `tailwindcss` | Utility-first styling |
| `@tailwindcss/vite` | Tailwind CSS v4 integration with Astro's Vite pipeline |
| `sass` | Compile reader and component SCSS |
| `typescript` | Type checking for TypeScript files |
| `@astrojs/check` | Astro component and TypeScript diagnostics |

Install with Bun, selecting mutually compatible current stable versions when implementation begins:

```sh
bun add astro tailwindcss @tailwindcss/vite sass
bun add -d typescript @astrojs/check
```

Commit `bun.lock` so local and Vercel builds use the same dependency graph. Do not add a UI framework, client-side router, database, or tooltip dependency; Astro components and a small browser script are sufficient. Do not add `@astrojs/vercel` initially: the site is fully static, so Vercel can serve Astro's generated output without an SSR adapter. Revisit the adapter only if server-rendered routes or functions become a requirement.

## Repository architecture

```text
content/
  stories/
    first-story.json        # Source only; not an Astro page or public asset
prompts/
  story-generation.md       # Reusable CEFR story-generation prompt
src/
  components/
    GlossGroup.astro         # Accessible interactive Spanish/English group
  layouts/
    BaseLayout.astro         # Document shell, metadata, shared styles
  lib/
    stories.ts               # Discover JSON stories and validate metadata
    story-schema.ts          # Validate and type the JSON story structure
    story-schema.test.ts     # Schema tests using Bun's test runner
  pages/
    index.astro              # Story index
    stories/
      [slug].astro           # Static reading page for each story
  styles/
    global.css               # Tailwind import and global/base rules
    reader.scss              # Reading typography and group interaction styles
astro.config.ts
tsconfig.json
package.json
bun.lock
```

Keep the story directory outside `src/pages` and static asset directories so the master copy cannot be published as a raw file. The story loader should only accept JSON files from `content/stories`, derive a URL-safe slug from each filename, parse each file as JSON, validate it against the story schema, and return typed story data. Store the title and CEFR level as JSON fields rather than Markdown frontmatter.

## JSON schema and build-time validation

Use one JSON object per story. The top-level object contains a non-empty `title`, a `cefr` value (`A1`, `A2`, `B1`, `B2`, `C1`, or `C2`), and a non-empty ordered `groups` array. Each group pairs a Spanish string with its English gloss:

```json
{
  "title": "Una mañana ocupada",
  "cefr": "A1",
  "groups": [
    { "spanish": "Ella", "english": "She" },
    { "spanish": "tiene hambre", "english": "is hungry" },
    { "spanish": "y", "english": "and" },
    { "spanish": "busca", "english": "looks for" },
    { "spanish": "una", "english": "an" },
    { "spanish": "manzana.", "english": "apple." }
  ]
}
```

Each group must contain exactly:

- `spanish`: a non-empty string containing at most four whitespace-delimited words.
- `english`: a non-empty string with the in-context meaning of the Spanish group.

Render groups in array order, inserting exactly one space between each adjacent pair. Include punctuation in the relevant Spanish and English strings. The story prompt must request raw JSON (not Markdown fences) and explain the schema. JSON's standard escaping handles quotes, backslashes, and line breaks.

Implement a TypeScript schema validator that checks JSON parse errors, required and unexpected fields, valid CEFR values, group object shape, string content, and the four-word maximum. Report the source filename and group index or field in errors. The `[slug].astro` route should load and validate all story sources when generating static paths. Any error must throw and stop `astro build`; it must never be caught and converted into an empty or partially rendered story. Add focused valid/invalid schema cases with Bun's built-in test runner.

## Page rendering and interaction

- `src/pages/index.astro` lists available stories with their title and CEFR level.
- `src/pages/stories/[slug].astro` creates one static page per source story using `getStaticPaths`.
- Render groups in order as inline, keyboard-operable controls, inserting one ordinary space between adjacent controls. Each control makes its paired English gloss available on activation. Include an accessible name/state and ensure keyboard focus is visible.
- Use a small Astro-bundled browser script to open/close glosses, support Escape, and avoid requiring a framework hydration runtime. Keep content readable if JavaScript is unavailable where practical.
- Render story values through Astro's normal escaped text/attribute interpolation. Do not inject story content with `set:html`.
- `BaseLayout.astro` owns the document metadata, responsive shell, global CSS, and shared navigation.

Tailwind handles page layout and reusable utility styling. Sass handles reader-specific typography, inline group states, and any small-screen refinements. Keep the two roles distinct to avoid maintaining duplicate rules.

## Prompt and author workflow

Keep the reusable CEFR-aware generation prompt in `prompts/story-generation.md`. It must request raw, valid JSON with the exact top-level fields and group shape, not Markdown or fenced code. Require every Spanish word to belong to a group of at most four words; use phrase-level glosses for idioms when they fit the limit, otherwise choose sensible shorter boundaries. State that the site inserts one space between groups and require punctuation to be included in the appropriate group. Make a topic optional.

Author workflow:

1. Generate a story with the prompt and choose its CEFR level.
2. Save the single master copy as `content/stories/<slug>.json`, including its title and CEFR level.
3. Run checks and tests locally, then build.
4. Commit and push. Vercel builds and publishes the static site; preview deployments can be used to review changes before production.

## Scripts and deployment

Configure these package scripts:

```json
{
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "check": "astro check",
  "test": "bun test"
}
```

Set Astro's output mode to static. Configure `astro.config.ts` with Astro's `defineConfig` and the Tailwind Vite plugin; import `@import "tailwindcss";` in the global stylesheet. Import the Sass stylesheet from the shared layout so Astro compiles it as part of the build.

Use `bun run check`, `bun run test`, and `bun run build` as the local verification sequence. Configure Vercel to install with Bun and run `bun run build`; keep the output directory at Astro's default `dist`. Verify the first deployment includes the story index and generated story routes, and does not expose files from `content/stories`.

## Implementation sequence and acceptance checks

1. **Scaffold:** initialize Astro, TypeScript, Bun scripts/lockfile, Tailwind, and Sass. Confirm the empty site builds locally.
2. **JSON content schema:** define the story and group types; implement schema tests for valid content, automatic inter-group spacing and punctuation, empty strings, invalid CEFR, excessive group length, unknown fields, and malformed JSON.
3. **Routes and reader:** add story discovery, index, static story route, shared layout, and accessible gloss interaction.
4. **Prompt and author docs:** add the reusable prompt and document how to create and validate a story.
5. **Deployment verification:** run check, tests, and production build; review generated routes and confirm source JSON is absent from public output; connect the repository to Vercel and verify a preview deployment.

The build is complete when a valid JSON story produces a static clickable reading page, each group reveals the matching English meaning, the page inserts one space between groups, invalid source blocks the build with an actionable diagnostic, and the Vercel deployment serves the same static pages without publishing master copies.
