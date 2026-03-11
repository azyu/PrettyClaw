export const CHAT_FONT_SIZE_STORAGE_KEY = "prettyclaw-chat-font-size-px";
export const DEFAULT_CHAT_FONT_SIZE_PX = 14;
export const MIN_CHAT_FONT_SIZE_PX = 12;
export const MAX_CHAT_FONT_SIZE_PX = 24;

interface StorageReader {
  getItem: (key: string) => string | null;
}

interface StorageWriter {
  setItem: (key: string, value: string) => void;
}

export function clampChatFontSizePx(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_CHAT_FONT_SIZE_PX;
  }

  return Math.min(MAX_CHAT_FONT_SIZE_PX, Math.max(MIN_CHAT_FONT_SIZE_PX, Math.round(value)));
}

export function loadChatFontSizePx(storage?: StorageReader | null): number {
  const source = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!source) {
    return DEFAULT_CHAT_FONT_SIZE_PX;
  }

  try {
    const raw = source.getItem(CHAT_FONT_SIZE_STORAGE_KEY);
    if (raw == null) {
      return DEFAULT_CHAT_FONT_SIZE_PX;
    }

    return clampChatFontSizePx(JSON.parse(raw) as number);
  } catch {
    return DEFAULT_CHAT_FONT_SIZE_PX;
  }
}

export function saveChatFontSizePx(value: number, storage?: StorageWriter | null) {
  const source = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!source) {
    return;
  }

  try {
    source.setItem(CHAT_FONT_SIZE_STORAGE_KEY, JSON.stringify(clampChatFontSizePx(value)));
  } catch {}
}

export function getChatFontSizeCssVars(value: number): Record<"--chat-font-size-px" | "--chat-line-height", string> {
  const style = getChatFontSizeStyle(value);

  return {
    "--chat-font-size-px": style.fontSize,
    "--chat-line-height": style.lineHeight,
  };
}

export function getChatFontSizeStyle(value: number): { fontSize: string; lineHeight: string } {
  const size = clampChatFontSizePx(value);

  return {
    fontSize: `${size}px`,
    lineHeight: size >= 18 ? "1.7" : "1.6",
  };
}

export function resolveChatFontSizeCommit(rawValue: string, currentValue: number): {
  nextInput: string;
  nextSize: number | null;
} {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return {
      nextInput: String(currentValue),
      nextSize: null,
    };
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) {
    return {
      nextInput: String(currentValue),
      nextSize: null,
    };
  }

  const nextSize = clampChatFontSizePx(parsed);

  return {
    nextInput: String(nextSize),
    nextSize,
  };
}
