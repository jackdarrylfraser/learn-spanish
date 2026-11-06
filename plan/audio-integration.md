# Audio Reading Integration Plan

## Overview
Add Spanish audio narration to each story, allowing learners to hear native speaker pronunciation while reading. This will enhance learning by exposing students to authentic Spanish sounds and rhythm.

## High-Level Architecture

```
Story Content → Audio Generation/Hosting → Audio UI Component → User Playback
```

## Decision Points & Recommendations

### 1. Audio Source (Choose One)

#### Option A: Google Cloud Text-to-Speech (Recommended for MVP)
**Pros:**
- Natural-sounding neural voices with multiple Spanish accents (Spain/Mexico/Argentina/Colombia)
- No additional external services needed beyond Google Cloud
- Deterministic: same text always produces same audio
- Audio can be pre-generated at build time
- Cost-effective for small projects (~$0.01-0.02 per story)

**Cons:**
- Requires Google Cloud account setup
- Build process takes longer (API calls to generate audio)
- Cached audio files need to be version-controlled or regenerated

**Implementation:** Generate audio files at build time, commit to repo, or deploy to CDN.

**Recommendation:** Start with **Google Cloud Text-to-Speech** with the Spain Spanish (Castilian) accent for authenticity.

---

### 2. Audio Storage & Delivery

#### Option B: Vercel Blob Storage (Recommended)
**Pros:**
- First-class Vercel integration
- Global CDN delivery
- Automatic caching
- Simple API
- No additional vendor lock-in beyond Vercel

**Cons:**
- Requires Vercel environment
- Small ongoing costs

**Recommendation:** Start with **Vercel Blob Storage** for seamless integration and scalability.

---

### 3. Build Process

#### Pre-generation at Build Time (Recommended)
```
Story JSON → Extract Spanish text → Google Cloud TTS → Generate audio file
→ Upload to Vercel Blob → Store reference in manifest → Update schema
```

**Pros:**
- Audio available immediately on deploy
- No runtime latency
- CDN caching handles performance

**Cons:**
- Build time increases (API calls)
- Requires service credentials in CI/CD

---

## Implementation Plan

### Phase 1: Schema Updates (Week 1)

#### 1.1 Update Story Schema
Modify `src/lib/story-schema.ts`:

```typescript
export interface Story {
  title: string;
  cefr: CefrLevel;
  groups: StoryGroup[];
  audio?: {
    url: string;           // Full audio narration URL
    duration: number;      // Duration in seconds
    narrator: string;      // "Google Cloud TTS (Spain Spanish)"
    generatedAt: string;   // ISO timestamp
  };
}
```

#### 1.2 Audio Metadata File (Optional)
Create `src/lib/audio-manifest.ts`:

```typescript
export interface AudioManifest {
  [storySlug: string]: {
    url: string;
    duration: number;
    narrator: string;
    version: string;       // Audio version (for regeneration)
  };
}
```

#### 1.3 Validation Updates
Ensure `validateStory()` handles optional `audio` field.

---

### Phase 2: Audio Generation Script (Week 1-2)

#### 2.1 Create Build Script
New file: `scripts/generate-audio.ts`

```typescript
import { getStories } from "../src/lib/stories";
import { textToSpeech } from "@google-cloud/text-to-speech";

export async function generateStoryAudio() {
  const stories = await getStories();
  
  for (const { slug, story } of stories) {
    // 1. Extract full Spanish text from groups
    const spanishText = story.groups
      .map(g => g.spanish)
      .join(" ");
    
    // 2. Call Google Cloud TTS
    const audioBuffer = await textToSpeech({
      text: spanishText,
      languageCode: "es-ES",
      voiceName: "es-ES-Neural2-A", // Female narrator
    });
    
    // 3. Upload to Vercel Blob
    const blob = await uploadToVercelBlob(
      audioBuffer,
      `audio/${slug}.mp3`
    );
    
    // 4. Update story metadata
    // (Update JSON or maintain separate manifest)
  }
}
```

#### 2.2 CI/CD Integration
Add to `package.json`:

```json
{
  "scripts": {
    "gen:audio": "ts-node scripts/generate-audio.ts",
    "build": "npm run gen:audio && astro build"
  }
}
```

#### 2.3 Environment Setup
Required environment variables:
- `GOOGLE_APPLICATION_CREDENTIALS` (for Google Cloud TTS)
- `BLOB_READ_WRITE_TOKEN` (for Vercel Blob upload)

---

### Phase 3: UI Components (Week 2)

#### 3.1 Audio Player Component
New file: `src/components/AudioPlayer.astro`

```astro
---
interface Props {
  audioUrl: string;
  storyTitle: string;
  duration?: number;
}

const { audioUrl, storyTitle, duration } = Astro.props;
---

<div class="audio-player">
  <audio
    controls
    class="audio-controls"
    aria-label={`Play audio for ${storyTitle}`}
  >
    <source src={audioUrl} type="audio/mpeg" />
    Your browser does not support the audio element.
  </audio>
  
  <div class="audio-info">
    <span class="speaker-icon" aria-hidden="true">🔊</span>
    <span class="audio-meta">
      Spanish narration
      {duration && <span class="duration">({Math.round(duration / 60)}m {Math.round(duration % 60)}s)</span>}
    </span>
  </div>
</div>

<style>
  .audio-player {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .audio-controls {
    width: 100%;
    margin-bottom: 0.5rem;
    border-radius: 4px;
  }
  
  .audio-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: white;
  }
  
  .speaker-icon {
    font-size: 1.25rem;
  }
  
  .audio-meta {
    font-weight: 500;
  }
  
  .duration {
    opacity: 0.8;
    margin-left: 0.25rem;
  }
</style>
```

#### 3.2 Story Page Integration
Update `src/pages/stories/[slug].astro`:

```astro
---
import AudioPlayer from "../../components/AudioPlayer.astro";
// ... existing imports

const { story } = Astro.props;
---

<BaseLayout title={...} description={...}>
  <article class="reader">
    <nav class="breadcrumbs" ...>
      {/* existing breadcrumbs */}
    </nav>

    <header class="reader-header">
      <h1>{story.title}</h1>
      <p>{story.cefr} · Select a phrase to see its English translation.</p>
    </header>

    {story.audio && (
      <AudioPlayer 
        audioUrl={story.audio.url}
        storyTitle={story.title}
        duration={story.audio.duration}
      />
    )}

    <section class="reader-content" ...>
      {/* existing story content */}
    </section>
  </article>

  <script>
    {/* existing tooltip logic */}
  </script>
</BaseLayout>
```

---

### Phase 4: Advanced Features (Optional - Week 3+)

#### 4.2 Playback Speed Control
Allow users to slow down/speed up narration (1.0x, 0.75x, etc.)

---

## Database/Storage Schema

### Metadata Option 1: Extend Story JSON (Simpler)
```json
{
  "title": "Una mañana ocupada",
  "cefr": "A1",
  "groups": [...],
  "audio": {
    "url": "https://cdn.vercel-blob.com/audio/una-manana-ocupada.mp3",
    "duration": 45,
    "narrator": "Google Cloud TTS (Spain Spanish, Neural2-A)"
  }
}
```
**Recommendation:** Start with Option 1 (inline) for simplicity.

---

## Technology Stack

- **Audio Generation:** Google Cloud Text-to-Speech API
- **Storage:** Vercel Blob Storage
- **Component Library:** None (vanilla Astro + CSS)
- **Streaming/Caching:** Native browser audio + CDN
- **Build Orchestration:** TypeScript script (ts-node)

---

## File Structure (Post-Implementation)

```
learn-spanish/
├── content/
│   └── stories/
│       ├── una-manana-ocupada.json
│       └── demo-1.json
├── public/
│   └── audio/                    (Optional: for Git-stored audio)
│       ├── una-manana-ocupada.mp3
│       └── demo-1.mp3
├── scripts/
│   └── generate-audio.ts         (NEW)
├── src/
│   ├── components/
│   │   ├── GlossGroup.astro
│   │   └── AudioPlayer.astro     (NEW)
│   ├── lib/
│   │   ├── stories.ts
│   │   ├── story-schema.ts       (UPDATED)
│   │   └── audio-manifest.ts     (NEW - optional)
│   └── pages/
│       └── stories/
│           └── [slug].astro      (UPDATED)
└── package.json
```

---

## Deployment Checklist

- [ ] Set up Google Cloud Text-to-Speech credentials
- [ ] Configure Vercel environment variables
- [ ] Update story schema with audio field
- [ ] Implement audio generation script
- [ ] Create AudioPlayer component
- [ ] Integrate audio player into story page
- [ ] Test locally with at least one story
- [ ] Generate audio for all existing stories
- [ ] Deploy and verify audio playback
- [ ] Document audio generation process for future stories
- [ ] (Optional) Add playback highlighting sync
- [ ] (Optional) Add narrator voice selection UI

---

## Cost Estimation

**Google Cloud TTS:**
- $0.016 per 1K characters (Neural2 voices)
- ~1,500 characters per A1 story
- Cost per story: ~$0.02-0.03
- For 50 stories: ~$1-1.50/month

**Vercel Blob:**
- 1GB free per month
- ~50-100KB per audio file
- 50 stories: ~2.5-5GB/month
- Overage: $0.50 per GB
- Estimated: ~$1/month

**Total Monthly Cost:** ~$2-3 for 50 stories

---

## Alternative: No Audio (Baseline)
If you decide audio isn't needed, this plan can be archived or revisited later.