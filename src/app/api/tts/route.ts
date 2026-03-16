import { NextResponse } from "next/server";
import { loadCharacterConfig } from "@/lib/character-config";
import { synthesizeCharacterSpeech } from "@/lib/tts-server";

export const runtime = "nodejs";

interface TtsRequestBody {
  characterId?: string;
  locale?: string;
  text?: string;
}

export async function POST(request: Request) {
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
  const result = await synthesizeCharacterSpeech(character, text);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new Response(result.buffer, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "no-store",
    },
  });
}
