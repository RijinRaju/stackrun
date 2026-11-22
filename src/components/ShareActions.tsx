"use client";
import { useRef, useState } from "react";
import type { Challenge, RunResult, Stack } from "@/engine";
import { sharePath } from "@/lib/share";
import { StackCard } from "./StackCard";

type CopyState = "idle" | "copied" | "failed";

export function ShareActions({
  stack,
  result,
  challenge,
}: {
  stack: Stack;
  result: RunResult;
  challenge: Challenge;
}) {
  const card = useRef<HTMLDivElement>(null);
  const [copy, setCopy] = useState<CopyState>("idle");
  const [downloading, setDownloading] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}${sharePath("/s", stack, challenge.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopy("copied");
    } catch {
      setCopy("failed");
      window.prompt("Copy this link:", url);
    }
    setTimeout(() => setCopy("idle"), 2000);
  }

  async function downloadCard() {
    if (!card.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const png = await toPng(card.current, {
        pixelRatio: 2,
        backgroundColor: "#09090b",
        skipFonts: true,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = png;
      a.download = `stackrun-${challenge.id}-${result.score}.png`;
      a.click();
    } catch (err) {
      console.error("Card download failed", err);
      alert("Sorry, the card couldn't be generated in this browser.");
    } finally {
      setDownloading(false);
    }
  }

  const btn =
    "rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800 disabled:opacity-60";

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={copyLink} className={btn}>
        {copy === "copied" ? "✓ Link copied" : "🔗 Share link"}
      </button>
      <button type="button" onClick={downloadCard} disabled={downloading} className={btn}>
        {downloading ? "Rendering…" : "⬇ Download card"}
      </button>

      {/* Off-screen, fixed-width copy of the card that the PNG is taken from.
          The wrapper is moved, not the card, so the captured node keeps normal styles. */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[10000px]">
        <StackCard
          ref={card}
          stack={stack}
          result={result}
          challenge={challenge}
          className="w-[600px] [&_ul]:grid-cols-2"
        />
      </div>
    </div>
  );
}
