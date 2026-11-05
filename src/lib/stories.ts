import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseStoryJson, type Story } from "./story-schema";

const storiesDirectory = join(process.cwd(), "content", "stories");

export interface LoadedStory {
  slug: string;
  story: Story;
}

function toSlug(filename: string): string {
  const stem = basename(filename, ".json");
  const slug = stem
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");

  if (!slug) {
    throw new Error(`Story filename "${filename}" does not produce a valid URL slug`);
  }

  return slug;
}

export async function getStories(): Promise<LoadedStory[]> {
  const filenames = (await readdir(storiesDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));
  const seenSlugs = new Set<string>();

  return Promise.all(
    filenames.map(async (filename) => {
      const slug = toSlug(filename);
      if (seenSlugs.has(slug)) {
        throw new Error(`Multiple story files resolve to the URL slug "${slug}"`);
      }
      seenSlugs.add(slug);

      const source = join(storiesDirectory, filename);
      const json = await readFile(source, "utf8");

      return {
        slug,
        story: parseStoryJson(json, filename),
      };
    }),
  );
}
