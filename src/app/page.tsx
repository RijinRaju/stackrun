import { loadData } from "@/engine/load";

// M1 placeholder: proves the data loads and validates. The real board lands in M3.
export default function Home() {
  const { phases, tools, challenges } = loadData();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-bold tracking-tight">StackRun</h1>
      <p className="mt-2 text-zinc-400">
        Pick a tool per phase, press Run, watch it pass or fail. {challenges.length} challenges,{" "}
        {tools.length} tools.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {phases.map((phase) => (
          <section key={phase.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="font-semibold">{phase.name}</h2>
            <p className="mt-1 text-xs text-zinc-500">{phase.description}</p>
            <ul className="mt-3 space-y-1 text-sm text-zinc-300">
              {tools
                .filter((t) => t.phase === phase.id)
                .map((t) => (
                  <li key={t.id}>{t.name}</li>
                ))}
              {phase.allowNone && <li className="text-zinc-500 italic">None</li>}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
