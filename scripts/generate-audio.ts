import { getStories } from "../src/lib/stories";
import type { Story } from "../src/lib/story-schema";
import * as fs from "fs";
import * as path from "path";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { put } from "@vercel/blob";

const TTS_CLIENT = new TextToSpeechClient();

interface GenerateAudioOptions {
  voiceName?: string;
  languageCode?: string;
  dryRun?: boolean;
}

async function generateStoryAudio(
  text: string,
  options: GenerateAudioOptions = {},
): Promise<Buffer> {
  const { voiceName = "es-ES-Neural2-A", languageCode = "es-ES" } = options;

  const request = {
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: 1, // MP3
      pitch: 0,
      speakingRate: 1,
    },
  };

  const response = await TTS_CLIENT.synthesizeSpeech(request as never);
  if (!response[0].audioContent) {
    throw new Error("No audio content in response");
  }

  return Buffer.from(response[0].audioContent as string, "binary");
}

async function uploadToVercelBlob(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN environment variable is not set");
  }

  const blob = await put(filename, buffer, {
    access: "public",
    token,
  });

  return blob.url;
}

function getAudioDuration(buffer: Buffer): number {
  // MP3 header parsing (simplified)
  // Frame size = 144000 * bitrate / sample_rate + padding
  // We'll estimate based on file size: ~128 kbps = 16 KB/second
  const estimatedKbps = 128;
  const fileSizeKB = buffer.length / 1024;
  return Math.round((fileSizeKB * 8) / estimatedKbps);
}

async function updateStoryFile(
  storyPath: string,
  audioUrl: string,
  duration: number,
): Promise<void> {
  const content = JSON.parse(fs.readFileSync(storyPath, "utf-8")) as Story;

  content.audio = {
    url: audioUrl,
    duration,
    narrator: "Google Cloud TTS (Spain Spanish, Neural2-A)",
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(storyPath, JSON.stringify(content, null, 2) + "\n");
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const storySlug = process.argv.find((arg) => !arg.startsWith("--"));

  console.log(`Audio Generation Script ${dryRun ? "(DRY RUN)" : ""}`);
  console.log("=====================================");

  try {
    const stories = await getStories();

    const targetStories = storySlug
      ? stories.filter(({ slug }) => slug === storySlug)
      : stories;

    if (targetStories.length === 0) {
      console.error(`No stories found${storySlug ? ` matching slug: ${storySlug}` : ""}`);
      process.exit(1);
    }

    for (const { slug, story } of targetStories) {
      console.log(`\nProcessing: ${slug}`);
      console.log(`  Title: ${story.title}`);

      // Extract full Spanish text from groups
      const spanishText = story.groups.map((g) => g.spanish).join(" ");
      console.log(`  Text length: ${spanishText.length} characters`);

      if (dryRun) {
        console.log("  [DRY RUN] Would generate audio");
        continue;
      }

      try {
        // Generate audio
        console.log("  Generating audio with Google Cloud TTS...");
        const audioBuffer = await generateStoryAudio(spanishText);
        console.log(`  Generated ${(audioBuffer.length / 1024).toFixed(1)} KB of audio`);

        // Upload to Vercel Blob
        console.log("  Uploading to Vercel Blob...");
        const audioUrl = await uploadToVercelBlob(audioBuffer, `audio/${slug}.mp3`);
        console.log(`  ✓ Uploaded: ${audioUrl}`);

        // Calculate duration
        const duration = getAudioDuration(audioBuffer);
        console.log(`  Duration: ~${Math.floor(duration / 60)}m ${duration % 60}s`);

        // Update story file
        const storyPath = path.join(process.cwd(), `content/stories/${slug}.json`);
        await updateStoryFile(storyPath, audioUrl, duration);
        console.log(`  ✓ Updated: ${slug}.json`);
      } catch (error) {
        console.error(
          `  ✗ Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        if (!storySlug) {
          // Continue with other stories if processing all
          continue;
        }
        throw error;
      }
    }

    console.log("\n✓ Audio generation complete!");
  } catch (error) {
    console.error(
      "Fatal error:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

main();
