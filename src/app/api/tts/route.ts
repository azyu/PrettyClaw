import { NextResponse } from "next/server";
import { loadCharacterConfig } from "@/lib/character-config";
import { TYPECAST_AUDIO_FORMAT, TYPECAST_MODEL, buildTypecastPayload } from "@/lib/tts";

export const runtime = "nodejs";

interface TtsRequestBody {
  characterId?: string;
  text?: string;
}

export async function POST(request: Request) {
  const apiKey = process.env.TYPECAST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TYPECAST_API_KEY is not configured" }, { status: 503 });
  }

  let body: TtsRequestBody;
  try {
    body = await request.json() as TtsRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const characterId = typeof body.characterId === "string" ? body.characterId : "";
  const text = typeof body.text === "string" ? body.text : "";

  if (!characterId || !text.trim()) {
    return NextResponse.json({ error: "characterId and text are required" }, { status: 400 });
  }

  const { characters } = await loadCharacterConfig();
  const character = characters.find((item) => item.id === characterId);

  if (!character?.tts?.enabled || character.tts.provider !== "typecast" || !character.tts.voiceId) {
    return NextResponse.json({ error: "TTS is not configured for this character" }, { status: 400 });
  }

  const model = process.env.TYPECAST_MODEL || TYPECAST_MODEL;
  const payload = buildTypecastPayload(character, text, model);
  if (!payload.text) {
    return NextResponse.json({ error: "Text is empty after normalization" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://typecast.ai/api/v1/text-to-speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    console.warn("Typecast TTS network failure:", error);
    return NextResponse.json({ error: "Typecast TTS request failed" }, { status: 502 });
  }

  if (!upstream.ok) {
    const errorBody = await upstream.text();
    console.warn("Typecast TTS failed:", upstream.status, errorBody.slice(0, 500));
    return NextResponse.json({ error: "Typecast TTS request failed" }, { status: upstream.status });
  }

  const buffer = await upstream.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") || `audio/${TYPECAST_AUDIO_FORMAT}`,
      "Cache-Control": "no-store",
    },
  });
}
