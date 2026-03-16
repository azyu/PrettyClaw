import { NextResponse } from "next/server";
import { loadCharacterConfig } from "@/lib/character-config";

export async function GET(request: Request) {
  const _request = request;
  const result = await loadCharacterConfig();

  return NextResponse.json({
    ...result,
    characters: result.characters,
  });
}
