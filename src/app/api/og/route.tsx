// GET /api/og?c=<challenge>&s=<stack> → 1200×630 PNG preview for X/LinkedIn.
// The score is computed here by the engine, never taken from the URL.
// Satori rules: inline styles only, flexbox only, any div with >1 child needs display:flex.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { evaluate, type RunStep } from "@/engine";
import { data, phases, toolById } from "@/lib/catalog";
import { logoGradient, logoInitials } from "@/lib/logo";
import { parseShare } from "@/lib/share";

const SIZE = { width: 1200, height: 630 };
const BG = "#09090b";
const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

const STATUS_COLOR: Record<RunStep["status"], string> = {
  ok: "#10b981",
  warn: "#fbbf24",
  fail: "#f43f5e",
  skipped: "#3f3f46",
};

function scoreColor(score: number, passed: boolean) {
  if (!passed) return "#fb7185";
  if (score >= 85) return "#34d399";
  if (score >= 60) return "#bef264";
  if (score >= 40) return "#fcd34d";
  return "#fb923c";
}

function Brand({ size = 40 }: { size?: number }) {
  return (
    <div style={{ display: "flex", fontSize: size, fontWeight: 900, letterSpacing: -1 }}>
      <span style={{ color: "#fafafa" }}>Stack</span>
      <span style={{ color: "#a78bfa" }}>Run</span>
    </div>
  );
}

function Logo({ id, name, size }: { id: string; name: string; size: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size * 0.22,
        backgroundImage: logoGradient(id),
        color: "white",
        fontSize: size * 0.38,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {logoInitials(name)}
    </div>
  );
}

function fallbackImage() {
  const sample = ["github", "github-actions", "docker", "kubernetes", "argocd", "sentry"];
  return (
    <div
      style={{
        ...SIZE,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        gap: 28,
        background: BG,
        backgroundImage: "radial-gradient(circle at 100% 0%, #4c1d9566, transparent 60%)",
        color: "#fafafa",
      }}
    >
      <Brand size={96} />
      <div style={{ display: "flex", fontSize: 44, color: "#d4d4d8", maxWidth: 900 }}>
        Pick a tool for each deploy phase, press Run, and get roasted.
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
        {sample.map((id) => (
          <Logo key={id} id={id} name={toolById(id)!.name} size={72} />
        ))}
      </div>
    </div>
  );
}

// Geist Bold/Black (OFL, assets/fonts/OFL.txt); next/og only bundles a regular weight.
let fonts: Promise<
  { name: string; data: Buffer; weight: 400 | 700 | 900; style: "normal" }[]
> | null = null;
function loadFonts() {
  fonts ??= Promise.all(
    (
      [
        ["Geist-Regular.woff", 400],
        ["Geist-Bold.woff", 700],
        ["Geist-Black.woff", 900],
      ] as const
    ).map(async ([file, weight]) => ({
      name: "Geist",
      data: await readFile(join(process.cwd(), "assets/fonts", file)),
      weight,
      style: "normal" as const,
    })),
  );
  return fonts;
}

async function options() {
  return { ...SIZE, fonts: await loadFonts(), headers: { "Cache-Control": CACHE } };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const { challenge, stack } = parseShare({
    c: params.get("c") ?? undefined,
    s: params.get("s") ?? undefined,
  });

  if (!stack) {
    return new ImageResponse(fallbackImage(), await options());
  }

  const result = evaluate(stack, challenge, data);

  return new ImageResponse(
    <div
      style={{
        ...SIZE,
        display: "flex",
        flexDirection: "column",
        padding: "48px 56px",
        gap: 32,
        background: BG,
        backgroundImage: "radial-gradient(circle at 100% 0%, #4c1d9555, transparent 55%)",
        color: "#fafafa",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Brand />
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#d4d4d8",
            background: "#27272a",
            padding: "8px 20px",
            borderRadius: 999,
          }}
        >
          {challenge.title}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              fontSize: 150,
              fontWeight: 900,
              lineHeight: 1,
              color: scoreColor(result.score, result.passed),
            }}
          >
            {String(result.score)}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 8,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 4,
              color: result.passed ? "#6ee7b7" : "#fda4af",
            }}
          >
            {result.passed ? "DEPLOYED" : "FAILED"}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            fontSize: 46,
            fontWeight: 700,
            lineHeight: 1.2,
            color: "#fafafa",
          }}
        >
          {`“${result.roast}”`}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {phases.map((phase, i) => {
          const tool = toolById(stack[phase.id]);
          const status = result.steps[i]!.status;
          return (
            <div
              key={phase.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: 260,
                padding: "10px 14px",
                borderRadius: 16,
                background: "#18181b",
                borderLeft: `6px solid ${tool ? STATUS_COLOR[status] : "#3f3f46"}`,
                opacity: status === "skipped" ? 0.45 : 1,
              }}
            >
              {tool ? (
                <Logo id={tool.id} name={tool.name} size={44} />
              ) : (
                <div
                  style={{
                    display: "flex",
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    border: "2px dashed #3f3f46",
                  }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <div style={{ display: "flex", fontSize: 14, color: "#71717a" }}>
                  {phase.name.toUpperCase()}
                </div>
                <div
                  style={{
                    display: "block",
                    maxWidth: 180,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    fontSize: 22,
                    color: tool ? "#fafafa" : "#71717a",
                  }}
                >
                  {tool?.name ?? "None"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "auto",
          fontSize: 22,
          color: "#71717a",
        }}
      >
        <div style={{ display: "flex" }}>
          {`${result.stats.toolCount} tools · ${result.stats.monthlyCostHint} · difficulty ${result.stats.avgDifficulty}/5`}
        </div>
        <div style={{ display: "flex", color: "#a78bfa", fontWeight: 700 }}>
          Can your stack beat it? →
        </div>
      </div>
    </div>,
    await options(),
  );
}
