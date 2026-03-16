interface ThinkingDeveloperBlock {
  type: "thinking";
  thinking: string;
}

interface ToolCallDeveloperBlock extends Record<string, unknown> {
  type: "toolCall";
}

export type LiveDeveloperBlock = ThinkingDeveloperBlock | ToolCallDeveloperBlock;

function isThinkingDeveloperBlock(block: LiveDeveloperBlock | undefined): block is ThinkingDeveloperBlock {
  return block?.type === "thinking";
}

function isToolCallDeveloperBlock(block: LiveDeveloperBlock | undefined): block is ToolCallDeveloperBlock {
  return block?.type === "toolCall";
}

function getThinkingText(data: Record<string, unknown>): string {
  if (typeof data.text === "string") {
    return data.text;
  }

  if (typeof data.delta === "string") {
    return data.delta;
  }

  return "";
}

function normalizeToolCallBlock(data: Record<string, unknown>): ToolCallDeveloperBlock {
  const block: ToolCallDeveloperBlock = { type: "toolCall" };

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      block[key] = value;
    }
  }

  return block;
}

export function appendLiveDeveloperPayload(
  blocks: LiveDeveloperBlock[],
  stream: string | undefined,
  data: Record<string, unknown> | undefined,
): LiveDeveloperBlock[] {
  if (!data) {
    return blocks;
  }

  if (stream === "thinking") {
    const nextText = getThinkingText(data);
    if (!nextText) {
      return blocks;
    }

    const nextBlocks = [...blocks];
    const lastBlock = nextBlocks.at(-1);

    if (typeof data.text === "string") {
      if (isThinkingDeveloperBlock(lastBlock)) {
        nextBlocks[nextBlocks.length - 1] = { type: "thinking", thinking: nextText };
      } else {
        nextBlocks.push({ type: "thinking", thinking: nextText });
      }
      return nextBlocks;
    }

    if (isThinkingDeveloperBlock(lastBlock)) {
      nextBlocks[nextBlocks.length - 1] = {
        type: "thinking",
        thinking: `${lastBlock.thinking}${nextText}`,
      };
    } else {
      nextBlocks.push({ type: "thinking", thinking: nextText });
    }

    return nextBlocks;
  }

  if (stream === "tool") {
    const nextBlock = normalizeToolCallBlock(data);
    const nextBlocks = [...blocks];
    const lastBlock = nextBlocks.at(-1);

    if (isToolCallDeveloperBlock(lastBlock)) {
      const nextId = typeof nextBlock.id === "string" ? nextBlock.id : null;
      const lastId = typeof lastBlock.id === "string" ? lastBlock.id : null;
      const nextName = typeof nextBlock.name === "string" ? nextBlock.name : null;
      const lastName = typeof lastBlock.name === "string" ? lastBlock.name : null;
      const isSameCall = (nextId && lastId === nextId) || (!nextId && nextName && lastName === nextName);

      if (isSameCall) {
        nextBlocks[nextBlocks.length - 1] = { ...lastBlock, ...nextBlock };
        return nextBlocks;
      }
    }

    nextBlocks.push(nextBlock);
    return nextBlocks;
  }

  return blocks;
}

export function stringifyLiveDeveloperPayload(blocks: LiveDeveloperBlock[]): string | undefined {
  if (blocks.length === 0) {
    return undefined;
  }

  return JSON.stringify(blocks, null, 2);
}
