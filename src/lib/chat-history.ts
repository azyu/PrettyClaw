import type { ChatMessage } from "@/types";

interface NormalizedHistoryMessage {
  content: string;
  developerContent?: string;
}

function extractStructuredParts(content: unknown): {
  textParts: string[];
  developerBlocks: unknown[];
} {
  if (Array.isArray(content)) {
    return content.reduce<{ textParts: string[]; developerBlocks: unknown[] }>(
      (acc, block) => {
        const next = extractStructuredParts(block);
        return {
          textParts: [...acc.textParts, ...next.textParts],
          developerBlocks: [...acc.developerBlocks, ...next.developerBlocks],
        };
      },
      { textParts: [], developerBlocks: [] },
    );
  }

  if (!content || typeof content !== "object") {
    return { textParts: [], developerBlocks: [] };
  }

  const block = content as Record<string, unknown>;
  const blockType = typeof block.type === "string" ? block.type : null;

  if (blockType === "thinking" || blockType === "toolCall") {
    return { textParts: [], developerBlocks: [content] };
  }

  if (typeof block.text === "string") {
    return { textParts: [block.text], developerBlocks: [] };
  }

  if ("content" in block) {
    return extractStructuredParts(block.content);
  }

  return { textParts: [], developerBlocks: [] };
}

export function normalizeHistoryMessage(content: unknown): NormalizedHistoryMessage {
  if (content == null) {
    return { content: "" };
  }

  if (typeof content === "string") {
    const trimmed = content.trim();

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return normalizeHistoryMessage(JSON.parse(content) as unknown);
      } catch {}
    }

    return { content };
  }

  const { textParts, developerBlocks } = extractStructuredParts(content);
  const extracted = textParts.join("").trim();

  if (extracted || developerBlocks.length > 0) {
    return {
      content: extracted,
      ...(developerBlocks.length > 0
        ? {
            developerContent: JSON.stringify(developerBlocks, null, 2),
          }
        : {}),
    };
  }

  return { content: JSON.stringify(content) };
}

export function normalizeHistoryMessageContent(content: unknown): string {
  return normalizeHistoryMessage(content).content;
}

export function shouldDisplayHistoryMessage(message: ChatMessage, developerMode: boolean): boolean {
  if (message.content.trim().length > 0) {
    return true;
  }

  return developerMode && typeof message.developerContent === "string" && message.developerContent.length > 0;
}

export function isPayloadOnlyHistoryMessage(message: ChatMessage): boolean {
  return message.content.trim().length === 0
    && typeof message.developerContent === "string"
    && message.developerContent.length > 0;
}
