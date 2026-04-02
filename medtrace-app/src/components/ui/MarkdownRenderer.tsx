"use client";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const blocks = parseBlocks(content);

  return (
    <div className={`text-sm space-y-2 ${className ?? ""}`}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "numbered"; num: string; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" }
  | { type: "code"; text: string }
  | { type: "empty" };

function parseBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table detection: line with pipes
    if (trimmed.startsWith("|") && trimmed.includes("|", 1)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const parsed = parseTable(tableLines);
      if (parsed) {
        blocks.push(parsed);
        continue;
      }
      i -= tableLines.length;
    }

    // Table separator lines (|---|---|)
    if (/^[\s|:\-]+$/.test(trimmed) && trimmed.includes("|")) { i++; continue; }

    // Headings: ##### → level 5, #### → 4, ### → 3, ## → 2, # → 1
    // Also handle "##### ### text" pattern (strip extra hashes)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(?:#{1,6}\s+)*(.*)/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 4);
      const text = headingMatch[2].replace(/^#+\s*/, "").trim();
      if (text) {
        blocks.push({ type: "heading", level, text });
        i++; continue;
      }
    }

    // Horizontal rules
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) { blocks.push({ type: "hr" }); i++; continue; }

    // Bullet points: - text, * text, • text, · text
    if (/^[-*•·]\s+/.test(trimmed)) {
      const text = trimmed.replace(/^[-*•·]\s+/, "");
      blocks.push({ type: "bullet", text });
      i++; continue;
    }

    // Numbered lists: 1. text, 1) text
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (numMatch) {
      blocks.push({ type: "numbered", num: numMatch[1], text: numMatch[2] });
      i++; continue;
    }

    // Code fence
    if (trimmed.startsWith("```")) { blocks.push({ type: "code", text: trimmed.slice(3) }); i++; continue; }

    // Empty lines
    if (trimmed === "") { blocks.push({ type: "empty" }); i++; continue; }

    // Everything else is a paragraph
    blocks.push({ type: "paragraph", text: trimmed });
    i++;
  }

  return blocks;
}

function parseTable(lines: string[]): Block | null {
  if (lines.length < 2) return null;

  const parseLine = (line: string) =>
    line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);

  const headers = parseLine(lines[0]);

  let dataStart = 1;
  if (lines[1] && /^[\s|:\-]+$/.test(lines[1])) dataStart = 2;

  const rows = lines.slice(dataStart).map(parseLine).filter((r) => r.length > 0);

  if (headers.length === 0) return null;
  return { type: "table", headers, rows };
}

function renderInline(text: string): React.ReactNode {
  // Split on: **bold**, __bold__, `code`, *italic*
  const parts = text.split(/(\*\*.*?\*\*|__.*?__|`.*?`|\*[^*]+?\*)/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i} className="text-[#F0FDF4] font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
      return <strong key={i} className="text-[#F0FDF4] font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={i} className="bg-white/[0.04] px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**") && part.length > 2) {
      return <em key={i} className="text-[#A1A1AA] italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderBlock(block: Block, key: number): React.ReactNode {
  switch (block.type) {
    case "heading":
      if (block.level === 1) return <h2 key={key} className="text-lg font-bold text-[#F0FDF4] mt-5 mb-2 flex items-center gap-2">{renderInline(block.text)}</h2>;
      if (block.level === 2) return <h3 key={key} className="text-base font-semibold text-[#F0FDF4] mt-4 mb-1.5 pb-1 border-b border-emerald-500/20 flex items-center gap-2">{renderInline(block.text)}</h3>;
      if (block.level === 3) return <h4 key={key} className="text-sm font-semibold text-emerald-400 mt-3 mb-1">{renderInline(block.text)}</h4>;
      // level 4+ (####, #####)
      return <h5 key={key} className="text-sm font-medium text-[#D1D5DB] mt-2 mb-1">{renderInline(block.text)}</h5>;

    case "paragraph":
      return <div key={key} className="text-[#D1D5DB] leading-relaxed">{renderInline(block.text)}</div>;

    case "bullet":
      return <div key={key} className="flex items-start gap-2 pl-2"><span className="text-emerald-400 mt-0.5 shrink-0">•</span><span className="text-[#D1D5DB]">{renderInline(block.text)}</span></div>;

    case "numbered":
      return <div key={key} className="flex items-start gap-2 pl-2"><span className="text-emerald-400 font-mono text-xs mt-0.5 shrink-0 w-5 text-right">{block.num}.</span><span className="text-[#D1D5DB]">{renderInline(block.text)}</span></div>;

    case "table":
      return (
        <div key={key} className="overflow-x-auto my-2 rounded-lg border border-white/[0.06]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/[0.04]">
                {block.headers.map((h, j) => (
                  <th key={j} className="px-3 py-2 text-left font-semibold text-[#D1D5DB] border-b border-white/[0.06]">{renderInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-[#141918]" : "bg-white/[0.04]/50"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-[#D1D5DB] border-b border-white/[0.04]">{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "hr":
      return <hr key={key} className="border-white/[0.06] my-3" />;

    case "code":
      return <code key={key} className="block bg-white/[0.04] rounded px-3 py-2 text-xs text-[#D1D5DB] font-mono">{block.text}</code>;

    case "empty":
      return <div key={key} className="h-1" />;
  }
}
