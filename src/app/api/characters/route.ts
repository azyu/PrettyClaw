import { NextResponse } from "next/server";
import { loadCharacterConfig } from "@/lib/character-config";

export async function GET() {
  const result = await loadCharacterConfig();
  return NextResponse.json(result);
}
