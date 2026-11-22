// Run with `npm run validate-data`. Exits 1 if any data file is invalid.
// Contributors: run this after editing anything in /data.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateData } from "../src/engine/load";

const root = join(import.meta.dirname, "..");
const read = (name: string): unknown => {
  const path = join(root, "data", `${name}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`✗ data/${name}.json is not valid JSON: ${(err as Error).message}`);
    process.exit(1);
  }
};

const res = validateData({
  phases: read("phases"),
  tools: read("tools"),
  rules: read("rules"),
  challenges: read("challenges"),
});

if (!res.ok) {
  console.error(`✗ ${res.errors.length} problem(s) in /data:\n`);
  for (const e of res.errors) console.error(`  - ${e}`);
  process.exit(1);
}

const { phases, tools, rules, challenges } = res.data;

// Missing logos are a warning only: logos land in M6.
const missingLogos = tools.filter((t) => !existsSync(join(root, "public", t.logo)));
if (missingLogos.length) {
  console.warn(
    `⚠ ${missingLogos.length} tool(s) have no logo file yet (public/logos/*), not failing.`,
  );
}

console.log(
  `✓ data OK: ${phases.length} phases, ${tools.length} tools, ${rules.length} rules, ${challenges.length} challenges`,
);
