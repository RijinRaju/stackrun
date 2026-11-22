// Load + validate the JSON data. Pure TS: JSON is bundled at build time, so this
// works the same in the browser, in API routes and in scripts/tests.
import phasesJson from "../../data/phases.json";
import toolsJson from "../../data/tools.json";
import rulesJson from "../../data/rules.json";
import challengesJson from "../../data/challenges.json";
import {
  ChallengesFileSchema,
  PHASE_IDS,
  PhasesFileSchema,
  RulesFileSchema,
  ToolsFileSchema,
  type Data,
} from "./schema";

export interface RawData {
  phases: unknown;
  tools: unknown;
  rules: unknown;
  challenges: unknown;
}

export type ValidationResult = { ok: true; data: Data } | { ok: false; errors: string[] };

const MIN_TOOLS_PER_PHASE = 3;

/** Schema-check every file, then check cross-references between them. */
export function validateData(raw: RawData): ValidationResult {
  const errors: string[] = [];

  const files = {
    phases: PhasesFileSchema.safeParse(raw.phases),
    tools: ToolsFileSchema.safeParse(raw.tools),
    rules: RulesFileSchema.safeParse(raw.rules),
    challenges: ChallengesFileSchema.safeParse(raw.challenges),
  };
  for (const [name, res] of Object.entries(files)) {
    if (!res.success) {
      for (const issue of res.error.issues) {
        errors.push(`${name}.json [${issue.path.join(".")}]: ${issue.message}`);
      }
    }
  }
  if (
    !files.phases.success ||
    !files.tools.success ||
    !files.rules.success ||
    !files.challenges.success
  ) {
    return { ok: false, errors };
  }

  const data: Data = {
    phases: files.phases.data,
    tools: files.tools.data,
    rules: files.rules.data,
    challenges: files.challenges.data,
  };
  errors.push(...checkReferences(data));
  return errors.length ? { ok: false, errors } : { ok: true, data };
}

/** Cross-file checks: unique ids, no unknown tool/capability/phase references. */
export function checkReferences(data: Data): string[] {
  const errors: string[] = [];

  const dupes = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${kind}: duplicate id "${id}"`);
      seen.add(id);
    }
  };
  dupes(
    "phases.json",
    data.phases.map((p) => p.id),
  );
  dupes(
    "tools.json",
    data.tools.map((t) => t.id),
  );
  dupes(
    "rules.json",
    data.rules.map((r) => r.id),
  );
  dupes(
    "challenges.json",
    data.challenges.map((c) => c.id),
  );

  // Phases: all 8, in the canonical order.
  const phaseOrder = data.phases.map((p) => p.id).join(",");
  if (phaseOrder !== PHASE_IDS.join(",")) {
    errors.push(`phases.json: phases must be exactly [${PHASE_IDS.join(", ")}] in that order`);
  }

  const toolById = new Map(data.tools.map((t) => [t.id, t]));
  const capabilities = new Set(data.tools.flatMap((t) => t.provides));
  const challengeTags = new Set(data.challenges.flatMap((c) => c.tags));

  for (const phase of PHASE_IDS) {
    const n = data.tools.filter((t) => t.phase === phase).length;
    if (n < MIN_TOOLS_PER_PHASE) {
      errors.push(
        `tools.json: phase "${phase}" has ${n} tools, needs at least ${MIN_TOOLS_PER_PHASE}`,
      );
    }
  }

  const tool = (ruleId: string, id: string) => {
    if (!toolById.has(id)) errors.push(`rules.json "${ruleId}": unknown tool id "${id}"`);
    return toolById.get(id);
  };

  for (const rule of data.rules) {
    switch (rule.type) {
      case "requires": {
        const t = tool(rule.id, rule.tool);
        for (const id of rule.needs.tools ?? []) {
          const needed = tool(rule.id, id);
          if (t && needed && t.phase === needed.phase) {
            errors.push(
              `rules.json "${rule.id}": "${rule.tool}" can never need "${id}", they're in the same phase`,
            );
          }
        }
        for (const cap of rule.needs.capabilities ?? []) {
          if (!capabilities.has(cap)) {
            errors.push(`rules.json "${rule.id}": no tool provides capability "${cap}"`);
          }
        }
        break;
      }
      case "conflicts":
      case "pairs_well": {
        const [a, b] = rule.tools.map((id) => tool(rule.id, id));
        if (a && b && a.phase === b.phase) {
          errors.push(
            `rules.json "${rule.id}": "${a.id}" and "${b.id}" are in the same phase and can't be picked together`,
          );
        }
        break;
      }
      case "overkill":
      case "insecure":
        tool(rule.id, rule.tool);
        break;
      case "missing": {
        const phase = data.phases.find((p) => p.id === rule.phase);
        if (phase && !phase.allowNone) {
          errors.push(
            `rules.json "${rule.id}": phase "${rule.phase}" can't be empty, so this rule never fires`,
          );
        }
        break;
      }
    }
    if ("when" in rule && rule.when?.tags) {
      for (const tag of rule.when.tags) {
        if (!challengeTags.has(tag)) {
          errors.push(`rules.json "${rule.id}": no challenge has tag "${tag}"`);
        }
      }
    }
  }

  for (const c of data.challenges) {
    const required = data.phases.filter((p) => !p.allowNone).map((p) => p.id);
    for (const p of required) {
      if (!c.mustHave.includes(p)) {
        errors.push(
          `challenges.json "${c.id}": mustHave should include "${p}" (it can't be empty)`,
        );
      }
    }
    for (const p of c.niceToHave) {
      if (c.mustHave.includes(p)) {
        errors.push(`challenges.json "${c.id}": "${p}" is in both mustHave and niceToHave`);
      }
    }
  }

  return errors;
}

let cached: Data | undefined;

/** Validated data bundled with the app. Throws if the data files are broken. */
export function loadData(): Data {
  if (cached) return cached;
  const res = validateData({
    phases: phasesJson,
    tools: toolsJson,
    rules: rulesJson,
    challenges: challengesJson,
  });
  if (!res.ok) throw new Error(`Invalid StackRun data:\n- ${res.errors.join("\n- ")}`);
  cached = res.data;
  return cached;
}
