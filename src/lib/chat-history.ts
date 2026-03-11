function extractStructuredText(content: unknown): string | null {
  if (Array.isArray(content)) {
    const text = content
      .map((block) => extractStructuredText(block))
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join("");

    return text ? text.trim() : null;
  }

  if (!content || typeof content !== "object") {
    return null;
  }

  const block = content as Record<string, unknown>;

  if (typeof block.text === "string" && block.type !== "thinking") {
    return block.text;
  }

  if ("content" in block) {
    return extractStructuredText(block.content);
  }

  return null;
}

export function normalizeHistoryMessageContent(content: unknown): string {
  if (content == null) {
    return "";
  }

  if (typeof content === "string") {
    const trimmed = content.trim();

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const extracted = extractStructuredText(JSON.parse(content) as unknown);
        if (extracted) {
          return extracted;
        }
      } catch {}
    }

    return content;
  }

  const extracted = extractStructuredText(content);
  if (extracted) {
    return extracted;
  }

  return JSON.stringify(content);
}
