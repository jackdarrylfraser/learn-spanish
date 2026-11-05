# Spanish Reading Site Plan

## Problem and proposed approach

Build a static Spanish reading site with Astro that deploys to Vercel. Allow no more than four Spanish words in a gloss group for a reader at the chosen CEFR level. Every gloss group is clickable.

Only one article is supplied per story: a single JSON master copy. The build validates it and generates a Spanish reading page. English is not rendered as a separate page; activating a Spanish gloss group displays its English meaning.

Provide a reusable prompt that asks an LLM to write a Spanish story at a chosen CEFR level as one JSON master copy. Each gloss group explicitly pairs a Spanish word or phrase with its English meaning. The site inserts one space between groups, so spacing does not need to be authored. CEFR is part of the prompt. Grouping is for per-word or per-phrase understanding, not for producing a grammatically perfect English translation.

## Master copy flow

1. **Prompt.** You paste the reusable prompt into an LLM with your CEFR level (and optionally a topic).
2. **Master copy.** The LLM returns valid JSON using an ordered `groups` array. Each group pairs a Spanish word or phrase with its English meaning. For example:
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
   The site inserts one space between each adjacent group automatically. Every Spanish group contains at most four words. Phrase-level groups may be used for idioms, with the in-context meaning. Include punctuation in the relevant Spanish and English strings.
3. **Clickable groups.** Each group is clickable. On the Spanish page, activating a group displays its English meaning; spaces between groups are rendered automatically and are not interactive.
4. **Save.** Save the JSON master copy as a `.json` file in a pre-build content folder that is not published directly to the site.
5. **Build.** The build validates the JSON and generates one Spanish reading page. Each group renders as an interactive element with its English meaning available to the page, with one space inserted between groups.
6. **Validation.** The build fails on invalid JSON, unsupported or missing fields, an invalid CEFR level, empty group strings, groups longer than four Spanish words, or malformed group entries.
7. **Deploy.** Commit and push; Vercel builds and publishes the static site.

## Todos

1. Inspect the repository, set up the minimal Astro + Vercel project, and choose file locations.
2. Define the JSON master-copy schema and a validator that returns ordered Spanish/English groups.
3. Add the reusable story-generation prompt with a CEFR-level placeholder that outputs valid JSON in the schema.
4. Render one Spanish reading page with every group clickable to show its English meaning.
5. Document the workflow, then run the build and verify rendering.

## Notes and considerations

- Static site: no server endpoint, API keys, or external service costs.
- Articles are changed through Git and require a deployment to appear.
- The English meanings are for understanding individual words or phrases; they do not need to form a fluent English translation of the full story.


using vercel, bun, typescript, tailwindcss, sass, astro