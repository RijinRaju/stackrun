import type { Tool } from "@/engine";

// Placeholder logo: initials on a colour derived from the tool id.
// Real SVG logos replace this in M6.
function hue(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function initials(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 1) return words[0]!.slice(0, 2);
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

export function ToolLogo({ tool, size = 36 }: { tool: Tool | null | undefined; size?: number }) {
  if (!tool) {
    return (
      <span
        aria-hidden
        className="grid shrink-0 place-items-center rounded-lg border border-dashed border-zinc-700 text-zinc-600"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        –
      </span>
    );
  }
  const h = hue(tool.id);
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-lg font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${h} 60% 42%), hsl(${(h + 40) % 360} 60% 30%))`,
      }}
    >
      {initials(tool.name)}
    </span>
  );
}
