export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];

export interface StoryGroup {
  spanish: string;
  english: string;
}

export interface AudioMetadata {
  url: string;
  duration: number;
  narrator: string;
  generatedAt: string;
}

export interface Story {
  title: string;
  cefr: CefrLevel;
  groups: StoryGroup[];
  audio?: AudioMetadata;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  optionalKeys: readonly string[],
  context: string,
): void {
  const unexpected = Object.keys(value).filter(
    (key) => !expectedKeys.includes(key) && !optionalKeys.includes(key),
  );
  const missing = expectedKeys.filter((key) => !(key in value));

  if (unexpected.length > 0) {
    throw new Error(`${context}: unexpected field${unexpected.length > 1 ? "s" : ""} ${unexpected.join(", ")}`);
  }

  if (missing.length > 0) {
    throw new Error(`${context}: missing field${missing.length > 1 ? "s" : ""} ${missing.join(", ")}`);
  }
}

function assertNonEmptyString(value: unknown, context: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${context} must be a non-empty string`);
  }

  if (value !== value.trim()) {
    throw new Error(`${context} must not have leading or trailing whitespace`);
  }
}

function isCefrLevel(value: string): value is CefrLevel {
  return CEFR_LEVELS.some((level) => level === value);
}

export function validateStory(value: unknown, source = "story"): Story {
  if (!isRecord(value)) {
    throw new Error(`${source}: expected a JSON object`);
  }

  assertExactKeys(value, ["title", "cefr", "groups"], ["audio"], source);
  assertNonEmptyString(value.title, `${source}.title`);

  if (typeof value.cefr !== "string" || !isCefrLevel(value.cefr)) {
    throw new Error(`${source}.cefr must be one of ${CEFR_LEVELS.join(", ")}`);
  }

  if (!Array.isArray(value.groups) || value.groups.length === 0) {
    throw new Error(`${source}.groups must be a non-empty array`);
  }

  const groups = value.groups.map((candidate, index): StoryGroup => {
    const context = `${source}.groups[${index}]`;

    if (!isRecord(candidate)) {
      throw new Error(`${context} must be an object`);
    }

    assertExactKeys(candidate, ["spanish", "english"], [], context);
    assertNonEmptyString(candidate.spanish, `${context}.spanish`);
    assertNonEmptyString(candidate.english, `${context}.english`);

    const wordCount = candidate.spanish.trim().split(/\s+/u).length;
    if (wordCount > 4) {
      throw new Error(`${context}.spanish contains ${wordCount} words; groups may contain at most 4`);
    }

    return {
      spanish: candidate.spanish,
      english: candidate.english,
    };
  });

  let audio: AudioMetadata | undefined;
  if (value.audio !== undefined) {
    if (!isRecord(value.audio)) {
      throw new Error(`${source}.audio must be an object`);
    }

    assertExactKeys(value.audio, ["url", "duration", "narrator", "generatedAt"], [], `${source}.audio`);
    assertNonEmptyString(value.audio.url, `${source}.audio.url`);
    assertNonEmptyString(value.audio.narrator, `${source}.audio.narrator`);
    assertNonEmptyString(value.audio.generatedAt, `${source}.audio.generatedAt`);

    if (typeof value.audio.duration !== "number" || value.audio.duration <= 0) {
      throw new Error(`${source}.audio.duration must be a positive number`);
    }

    audio = {
      url: value.audio.url,
      duration: value.audio.duration,
      narrator: value.audio.narrator,
      generatedAt: value.audio.generatedAt,
    };
  }

  return {
    title: value.title,
    cefr: value.cefr,
    groups,
    audio,
  };
}

export function parseStoryJson(json: string, source: string): Story {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`${source}: ${detail}`);
  }

  return validateStory(parsed, source);
}
