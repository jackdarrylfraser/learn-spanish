# Spanish Story Generation Prompt

Write a short Spanish story for a learner at CEFR level **{{CEFR_LEVEL}}**.

Optional topic: **{{TOPIC}}**

Return only one valid JSON object. Do not wrap it in Markdown fences or include commentary.

Use exactly this structure:

```json
{
  "title": "A short story title",
  "cefr": "A1",
  "groups": [
    { "spanish": "Spanish word or phrase", "english": "In-context English meaning" }
  ]
}
```

Requirements:

- Set `cefr` to the requested level.
- Include every Spanish word in an ordered group. Each `spanish` value must contain no more than four words.
- Group words or short phrases in a useful way for understanding. Keep idioms together when they fit the four-word limit and translate their meaning in context.
- Include punctuation in the appropriate Spanish and English strings.
- The site automatically inserts exactly one space between adjacent groups. Do not put leading or trailing spaces in either string and do not create separate whitespace groups.
- Make the English gloss useful for understanding that Spanish group. It does not need to form a fluent translation when all glosses are read in sequence.
- Use standard JSON string escaping and ensure the result parses as JSON.
