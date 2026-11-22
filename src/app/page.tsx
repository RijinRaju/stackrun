import { Board } from "@/components/Board";
import { SiteHeader } from "@/components/SiteHeader";
import { parseShare } from "@/lib/share";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { challenge, stack } = parseShare(await searchParams);
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <SiteHeader tagline="Pick a tool for each phase, press Run, and see if your deploy survives." />
      <Board initialChallengeId={challenge.id} initialStack={stack} />
    </main>
  );
}
