"use client";

import type { ReactNode } from "react";

type MarkdownPreviewProps = {
  content: string;
};

function formatInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*.+?\*\*|\*.+?\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(<strong key={`${match.index}-b`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(<em key={`${match.index}-i`}>{token.slice(1, -1)}</em>);
    } else {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${match.index}-a`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="note-markdown-link"
          >
            {linkMatch[1]}
          </a>,
        );
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const trimmed = content.trim();

  if (!trimmed) {
    return <p className="note-markdown-empty">Nothing written yet — your reflections will appear here.</p>;
  }

  const blocks = trimmed.split(/\n{2,}/);

  return (
    <div className="note-markdown-preview">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const heading = lines[0]?.match(/^(#{1,3})\s+(.+)$/);

        if (heading) {
          const level = heading[1].length;
          const text = heading[2];
          const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
          return (
            <Tag key={index} className="note-markdown-heading">
              {formatInline(text)}
            </Tag>
          );
        }

        if (lines.every((line) => /^[-*]\s+/.test(line.trim()))) {
          return (
            <ul key={index} className="note-markdown-list">
              {lines.map((line) => (
                <li key={line}>{formatInline(line.replace(/^[-*]\s+/, "").trim())}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="note-markdown-paragraph">
            {formatInline(lines.join(" "))}
          </p>
        );
      })}
    </div>
  );
}
