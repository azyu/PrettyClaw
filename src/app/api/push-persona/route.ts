import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const WORKSPACE = join(homedir(), ".openclaw", "workspace");

// Backup originals on first call
let backedUp = false;
const BACKUP_SUFFIX = ".prettyclaw-backup";

async function backupOriginals() {
  if (backedUp) return;
  for (const file of ["IDENTITY.md", "SOUL.md", "USER.md"]) {
    const src = join(WORKSPACE, file);
    const bak = join(WORKSPACE, file + BACKUP_SUFFIX);
    if (existsSync(src) && !existsSync(bak)) {
      const content = await readFile(src, "utf-8");
      await writeFile(bak, content, "utf-8");
    }
  }
  backedUp = true;
}

export async function POST(req: NextRequest) {
  try {
    const { identity, soul, user } = await req.json();

    await backupOriginals();

    if (identity) {
      await writeFile(join(WORKSPACE, "IDENTITY.md"), identity, "utf-8");
    }
    if (soul) {
      await writeFile(join(WORKSPACE, "SOUL.md"), soul, "utf-8");
    }
    if (user) {
      await writeFile(join(WORKSPACE, "USER.md"), user, "utf-8");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to push persona:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
