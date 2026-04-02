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

    // Table detection: line with pipes
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const parsed = parseTable(tableLines);
      if (parsed) {
        blocks.push(parsed);
        continue; // i already advanced past the table
      }
      // If table parse failed, rewind and treat first line as paragraph
      i -= tableLines.length;
    }

    if (line.startsWith("### ")) { blocks.push({ type: "heading", level: 3, text: line.slice(4) }); }
    else if (line.startsWith("## ")) { blocks.push({ type: "heading", level: 2, text: line.slice(3) }); }
    else if (line.startsWith("# ")) { blocks.push({ type: "heading", level: 1, text: line.slice(2) }); }
    else if (line.startsWith("---") || line.startsWith("***")) { blocks.push({ type: "hr" }); }
    else if (line.startsWith("- ") || line.startsWith("* ")) { blocks.push({ type: "bullet", text: line.slice(2) }); }
    else if (/^\d+\.\s/.test(line)) { const match = line.match(/^(\d+)\.\s(.*)$/); blocks.push({ type: "numbered", num: match?.[1] ?? "", text: match?.[2] ?? line }); }
    else if (line.startsWith("```")) { blocks.push({ type: "code", text: line.slice(3) }); }
    else if (/^[|:\-\s]+$/.test(line.trim())) { blocks.push({ type: "empty" }); } // skip table separator lines
    else if (line.trim() === "") { blocks.push({ type: "empty" }); }
    else { blocks.push({ type: "paragraph", text: line }); }

    i++;
  }

  return blocks;
}

function parseTable(lines: string[]): Block | null {
  if (lines.length < 2) return null;

  const parseLine = (line: string) =>
    line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);

  const headers = parseLine(lines[0]);

  // Skip separator line (---|---|---)
  let dataStart = 1;
  if (lines[1] && /^[\s|:-]+$/.test(lines[1])) dataStart = 2;

  const rows = lines.slice(dataStart).map(parseLine).filter((r) => r.length > 0);

  if (headers.length === 0) return null;
  return { type: "table", headers, rows };
}

function renderInline(text: string): React.ReactNode {
  // Split on: **bold**, __bold__, `code`, *italic*
  const parts = text.split(/(\*\*.*?\*\*|__.*?__|`.*?`|\*[^*]+?\*)/g);
  return parts.map((part, i) => {
    if (!part) return null;
    // Bold **text** or __text__
    if ((part.startsWith("**") && part.endsWith("**"))) {
      return <strong key={i} className="text-[#F0FDF4] font-semibold">{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={i} className="text-[#F0FDF4] font-semibold">{part.slice(2, -2)}</strong>;
    }
    // Inline code `text`
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return <code key={i} className="bg-white/[0.04] px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    // Italic *text* (single asterisk, not empty)
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**") && part.length > 2) {
      return <em key={i} className="text-[#A1A1AA] italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderBlock(block: Block, key: number): React.ReactNode {
  switch (block.type) {
    case "heading":
      if (block.level === 1) return <h2 key={key} className="text-lg font-bold text-[#F0FDF4] mt-4 mb-1 flex items-center gap-2">{renderInline(block.text)}</h2>;
      if (block.level === 2) return <h3 key={key} className="text-base font-semibold text-[#F0FDF4] mt-4 mb-1.5 pb-1 border-b border-emerald-500/20 flex items-center gap-2">{renderInline(block.text)}</h3>;
      return <h4 key={key} className="text-sm font-semibold text-[#D1D5DB] mt-2 mb-1">{renderInline(block.text)}</h4>;

    case "paragraph":
      return <div key={key} className="text-[#D1D5DB] leading-relaxed">{renderInline(block.text)}</div>;

    case "bullet":
      return <div key={key} className="flex items-start gap-2 pl-2"><span className="text-emerald-400 mt-1 shrink-0">•</span><span className="text-[#D1D5DB]">{renderInline(block.text)}</span></div>;

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
