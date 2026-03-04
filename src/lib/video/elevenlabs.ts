import { promises as fs } from "fs";
import path from "path";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("elevenlabs");

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

/**
 * Default to a deep male voice ("Brian" - natural, authoritative).
 * Override via ELEVENLABS_VOICE_ID env var.
 * Browse voices at https://elevenlabs.io/voice-library
 */
const DEFAULT_VOICE_ID = "nPczCjzI2devNBz1zQrb";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

/**
 * Generate a voiceover MP3 from text using ElevenLabs TTS.
 * Saves the file to public/uploads/audio/ and returns the public URL.
 */
export async function generateVoiceover(text: string): Promise<string> {
  const apiKey = getApiKey();
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  log.info({ textLength: text.length, voiceId }, "Generating voiceover");

  const res = await fetch(
    `${ELEVENLABS_API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs API ${res.status}: ${body || res.statusText}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  const filename = `vo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.mp3`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "audio");

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), audioBuffer);

  log.info({ filename, bytes: audioBuffer.length }, "Voiceover saved");
  return `/uploads/audio/${filename}`;
}
