// Read-only shared stack: /s?c=<challenge>&s=<stack>.
// The result is re-computed by the engine from the stack; nothing is trusted from the URL.
import type { Metadata } from "next";
import Link from "next/link";
import { ResultView } from "@/components/ResultView";
import { ShareActions } from "@/components/ShareActions";
import { StackCard } from "@/components/StackCard";
import { evaluate } from "@/engine";
import { data } from "@/lib/catalog";
import { parseShare, sharePath, shareQuery } from "@/lib/share";

async function load(searchParams: PageProps<"/s">["searchParams"]) {
  const { challenge, stack } = parseShare(await searchParams);
  return { challenge, stack, result: stack ? evaluate(stack, challenge, data) : null };
}

export async function generateMetadata({ searchParams }: PageProps<"/s">): Promise<Metadata> {
  const { challenge, stack, result } = await load(searchParams);
  if (!stack || !result) return { title: "Shared stack · StackRun" };

  const title = result.passed
    ? `${result.score}/100 on “${challenge.title}” · StackRun`
    : `Deploy failed on “${challenge.title}” · StackRun`;
  const image = `/api/og?${shareQuery(stack, challenge.id)}`;
  return {
    title,
    description: result.roast,
    openGraph: {
      title,
      description: result.roast,
      url: sharePath("/s", stack, challenge.id),
      images: [{ url: image, width: 1200, height: 630, alt: `Stack card: ${result.roast}` }],
    },
    twitter: { card: "summary_large_image", title, description: result.roast, images: [image] },
  };
}

const primaryBtn =
  "rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400";
const secondaryBtn =
  "rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800";

export default async function SharedStackPage({ searchParams }: PageProps<"/s">) {
  const { challenge, stack, result } = await load(searchParams);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:py-10">
      <Link href="/" className="text-3xl font-black tracking-tight">
        Stack<span className="text-violet-400">Run</span>
      </Link>

      {!stack || !result ? (
        <section className="flex flex-col items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h1 className="text-2xl font-bold">This stack link doesn’t work</h1>
          <p className="text-zinc-400">
            It may be cut off, or it uses a tool that no longer exists. Build a fresh one instead.
          </p>
          <Link href="/" className={primaryBtn}>
            Build your own stack
          </Link>
        </section>
      ) : (
        <>
          <header>
            <p className="text-sm font-medium tracking-wide text-violet-300 uppercase">
              Shared stack · {challenge.title}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {result.passed
                ? `Scored ${result.score}/100. Can you beat it?`
                : "This deploy didn’t make it. Can you fix it?"}
            </h1>
            <p className="mt-2 max-w-2xl text-zinc-400">{challenge.brief}</p>
          </header>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
            <StackCard stack={stack} result={result} challenge={challenge} />
            <div className="flex flex-col gap-3">
              <Link href={`/?c=${challenge.id}`} className={`${primaryBtn} text-center`}>
                ▶ Build your own
              </Link>
              <Link
                href={sharePath("/", stack, challenge.id)}
                className={`${secondaryBtn} text-center`}
              >
                Remix this stack
              </Link>
              <ShareActions stack={stack} result={result} challenge={challenge} />
            </div>
          </div>

          <ResultView result={result} challenge={challenge} />
        </>
      )}
    </main>
  );
}
