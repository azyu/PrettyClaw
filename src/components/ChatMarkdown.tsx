"use client";

import type { CSSProperties, ComponentPropsWithoutRef } from "react";
import Markdown from "react-markdown";
import { clampChatFontSizePx, getChatFontSizeStyle } from "@/lib/chat-font-size";

interface ChatMarkdownProps {
  content: string;
  fontSizePx: number;
}

function mergeStyle(base: CSSProperties, incoming?: CSSProperties): CSSProperties {
  return incoming ? { ...base, ...incoming } : base;
}

export function ChatMarkdown({ content, fontSizePx }: ChatMarkdownProps) {
  const textStyle = getChatFontSizeStyle(fontSizePx);
  const headingFontSize = `${Math.round(clampChatFontSizePx(fontSizePx) * 1.15)}px`;
  const headingStyle: CSSProperties = {
    fontSize: headingFontSize,
    lineHeight: "1.4",
    margin: "0.35em 0",
    fontWeight: 600,
  };
  const listStyle: CSSProperties = {
    ...textStyle,
    margin: "0.35em 0",
    paddingInlineStart: "1.25em",
  };
  const blockStyle: CSSProperties = {
    ...textStyle,
    margin: "0.35em 0",
  };
  const codeStyle: CSSProperties = {
    ...textStyle,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  };
  const preStyle: CSSProperties = {
    ...codeStyle,
    margin: "0.35em 0",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
  };

  return (
    <Markdown
      components={{
        p: (props: ComponentPropsWithoutRef<"p">) => <p {...props} style={mergeStyle(blockStyle, props.style)} />,
        ul: (props: ComponentPropsWithoutRef<"ul">) => <ul {...props} style={mergeStyle(listStyle, props.style)} />,
        ol: (props: ComponentPropsWithoutRef<"ol">) => <ol {...props} style={mergeStyle(listStyle, props.style)} />,
        li: (props: ComponentPropsWithoutRef<"li">) => <li {...props} style={mergeStyle(textStyle, props.style)} />,
        blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
          <blockquote {...props} style={mergeStyle(blockStyle, props.style)} />
        ),
        pre: (props: ComponentPropsWithoutRef<"pre">) => <pre {...props} style={mergeStyle(preStyle, props.style)} />,
        code: (props: ComponentPropsWithoutRef<"code">) => <code {...props} style={mergeStyle(codeStyle, props.style)} />,
        h1: (props: ComponentPropsWithoutRef<"h1">) => <h1 {...props} style={mergeStyle(headingStyle, props.style)} />,
        h2: (props: ComponentPropsWithoutRef<"h2">) => <h2 {...props} style={mergeStyle(headingStyle, props.style)} />,
        h3: (props: ComponentPropsWithoutRef<"h3">) => <h3 {...props} style={mergeStyle(headingStyle, props.style)} />,
        h4: (props: ComponentPropsWithoutRef<"h4">) => <h4 {...props} style={mergeStyle(headingStyle, props.style)} />,
        h5: (props: ComponentPropsWithoutRef<"h5">) => <h5 {...props} style={mergeStyle(headingStyle, props.style)} />,
        h6: (props: ComponentPropsWithoutRef<"h6">) => <h6 {...props} style={mergeStyle(headingStyle, props.style)} />,
      }}
    >
      {content}
    </Markdown>
  );
}
