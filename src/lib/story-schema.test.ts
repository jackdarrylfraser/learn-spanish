import { describe, expect, test } from "bun:test";
import { parseStoryJson, validateStory, type Story } from "./story-schema";

const validStory: Story = {
  title: "Una mañana",
  cefr: "A1",
  groups: [
    { spanish: "Ella", english: "She" },
    { spanish: "tiene hambre.", english: "is hungry." },
  ],
};

describe("validateStory", () => {
  test("accepts a valid story with the exact schema", () => {
    expect(validateStory(validStory)).toEqual(validStory);
  });

  test("preserves order and spacing is inserted by joining groups", () => {
    const story = validateStory(validStory);
    expect(story.groups.map((group) => group.spanish).join(" ")).toBe("Ella tiene hambre.");
  });

  test("rejects an invalid CEFR level", () => {
    expect(() => validateStory({ ...validStory, cefr: "C3" })).toThrow("cefr must be one of");
  });

  test("rejects an empty Spanish or English gloss", () => {
    expect(() =>
      validateStory({
        ...validStory,
        groups: [{ spanish: " ", english: "meaning" }],
      }),
    ).toThrow("spanish must be a non-empty string");
    expect(() =>
      validateStory({
        ...validStory,
        groups: [{ spanish: "palabra", english: "" }],
      }),
    ).toThrow("english must be a non-empty string");
  });

  test("rejects leading or trailing whitespace in gloss strings", () => {
    expect(() =>
      validateStory({
        ...validStory,
        groups: [{ spanish: " palabra", english: "word" }],
      }),
    ).toThrow("spanish must not have leading or trailing whitespace");
    expect(() =>
      validateStory({
        ...validStory,
        groups: [{ spanish: "palabra", english: " word " }],
      }),
    ).toThrow("english must not have leading or trailing whitespace");
  });

  test("rejects Spanish groups with more than four words", () => {
    expect(() =>
      validateStory({
        ...validStory,
        groups: [{ spanish: "uno dos tres cuatro cinco", english: "one two three four five" }],
      }),
    ).toThrow("at most 4");
  });

  test("rejects missing and unexpected fields", () => {
    expect(() => validateStory({ title: "Story", cefr: "A1" })).toThrow("missing field groups");
    expect(() => validateStory({ ...validStory, author: "Someone" })).toThrow("unexpected field author");
  });
});

describe("parseStoryJson", () => {
  test("reports malformed JSON with the source filename", () => {
    expect(() => parseStoryJson("{", "broken.json")).toThrow("broken.json:");
  });
});
