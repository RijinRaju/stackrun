import type { Tool } from "@/engine";
import { logoGradient, logoInitials } from "@/lib/logo";

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
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-lg font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: logoGradient(tool.id),
      }}
    >
      {logoInitials(tool.name)}
    </span>
  );
}
