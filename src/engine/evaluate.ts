// evaluate(stack, challenge, data) → RunResult (SPEC.md section 6).
// Pure TypeScript, no React or DB imports, no randomness or clock: the same
// input always gives the same output, so the server can re-run it to trust a score.
import { pickBurns, pickRoast } from "./roast";
import { computeScore } from "./score";
import {
  PHASE_IDS,
  type Bonus,
  type Challenge,
  type Condition,
  type Data,
  type Issue,
  type PhaseId,
  type RunResult,
  type RunStep,
  type Stack,
  type Tool,
} from "./schema";

/** Problems that make a stack invalid input (not a failed run). Empty = OK to evaluate. */
export function checkStack(stack: Stack, data: Data): string[] {
  const problems: string[] = [];
  for (const phase of PHASE_IDS) {
    const id = stack[phase];
    if (id === null || id === undefined) continue;
    const tool = data.tools.find((t) => t.id === id);
    if (!tool) problems.push(`unknown tool "${id}" in phase "${phase}"`);
    else if (tool.phase !== phase)
      problems.push(`"${id}" belongs in "${tool.phase}", not "${phase}"`);
  }
  return problems;
}

export function matchesCondition(cond: Condition | undefined, challenge: Challenge): boolean {
  if (!cond) return true;
  if (cond.scales && !cond.scales.includes(challenge.scale)) return false;
  if (cond.tags && !cond.tags.some((t) => challenge.tags.includes(t))) return false;
  return true;
}

const phaseIndex = (p: PhaseId) => PHASE_IDS.indexOf(p);

/** Apply every rule to the stack. Issues are sorted by phase, then errors first, then rule order. */
export function applyRules(
  stack: Stack,
  challenge: Challenge,
  data: Data,
): { issues: Issue[]; bonuses: Bonus[] } {
  const selected = new Map<string, Tool>();
  for (const phase of PHASE_IDS) {
    const tool = data.tools.find((t) => t.id === stack[phase]);
    if (tool) selected.set(tool.id, tool);
  }
  const capabilities = new Set([...selected.values()].flatMap((t) => t.provides));

  const issues: Issue[] = [];
  const bonuses: Bonus[] = [];

  // Phases that can't be empty (source, runtime) are a hard error if left empty.
  for (const phase of data.phases) {
    if (!phase.allowNone && !stack[phase.id]) {
      issues.push({
        ruleId: `required-${phase.id}`,
        type: "missing",
        severity: "error",
        phase: phase.id,
        tool: null,
        message: `Every deploy needs ${phase.name.toLowerCase()}. Pick one.`,
      });
    }
  }

  for (const rule of data.rules) {
    switch (rule.type) {
      case "requires": {
        const tool = selected.get(rule.tool);
        if (!tool) break;
        const ok =
          (rule.needs.tools ?? []).some((id) => selected.has(id)) ||
          (rule.needs.capabilities ?? []).some((c) => capabilities.has(c));
        if (!ok) issues.push(issueFor(rule, tool.phase, tool.id));
        break;
      }
      case "conflicts": {
        const [a, b] = rule.tools.map((id) => selected.get(id));
        if (!a || !b) break;
        // It breaks where the second tool joins the flow.
        const later = phaseIndex(a.phase) >= phaseIndex(b.phase) ? a : b;
        issues.push(issueFor(rule, later.phase, later.id));
        break;
      }
      case "pairs_well": {
        if (rule.tools.every((id) => selected.has(id))) {
          bonuses.push({
            ruleId: rule.id,
            tools: rule.tools,
            bonus: rule.bonus,
            message: rule.message,
          });
        }
        break;
      }
      case "overkill":
      case "insecure": {
        const tool = selected.get(rule.tool);
        if (tool && matchesCondition(rule.when, challenge)) {
          issues.push(issueFor(rule, tool.phase, tool.id));
        }
        break;
      }
      case "missing": {
        if (!stack[rule.phase] && matchesCondition(rule.when, challenge)) {
          issues.push(issueFor(rule, rule.phase, null));
        }
        break;
      }
    }
  }

  // Stable sort keeps rule-file order as the final tie-break.
  issues.sort(
    (x, y) =>
      phaseIndex(x.phase) - phaseIndex(y.phase) ||
      (x.severity === y.severity ? 0 : x.severity === "error" ? -1 : 1),
  );
  return { issues, bonuses };
}

function issueFor(
  rule: { id: string; type: Issue["type"]; severity: string; message: string },
  phase: PhaseId,
  tool: string | null,
): Issue {
  return {
    ruleId: rule.id,
    type: rule.type,
    severity: rule.severity === "error" ? "error" : "warning",
    phase,
    tool,
    message: rule.message,
  };
}

/** Walk phases in order. The first error fails that step; every later step is skipped. */
export function buildSteps(stack: Stack, issues: Issue[], bonuses: Bonus[], data: Data): RunStep[] {
  const toolPhase = new Map(data.tools.map((t) => [t.id, t.phase]));
  let failed = false;
  return PHASE_IDS.map((phase): RunStep => {
    const tool = stack[phase] ?? null;
    if (failed) return { phase, tool, status: "skipped", messages: [] };

    const here = issues.filter((i) => i.phase === phase);
    const pairs = bonuses.filter((b) => {
      // show a bonus on the later of its two phases
      const [pa, pb] = b.tools.map((id) => phaseIndex(toolPhase.get(id)!));
      return Math.max(pa!, pb!) === phaseIndex(phase);
    });
    const messages = [...here.map((i) => i.message), ...pairs.map((b) => b.message)];

    if (here.some((i) => i.severity === "error")) {
      failed = true;
      return { phase, tool, status: "fail", messages };
    }
    return { phase, tool, status: here.length ? "warn" : "ok", messages };
  });
}

function monthlyCostHint(tools: Tool[]): string {
  const paid = tools.filter((t) => t.cost === "paid").length;
  if (paid === 0) return tools.some((t) => t.cost === "freemium") ? "$0 (free tiers)" : "$0";
  if (paid <= 2) return "~$5–50/mo";
  if (paid <= 4) return "~$50–500/mo";
  return "$500+/mo";
}

export function evaluate(stack: Stack, challenge: Challenge, data: Data): RunResult {
  const problems = checkStack(stack, data);
  if (problems.length) throw new Error(`Invalid stack: ${problems.join("; ")}`);

  const tools = PHASE_IDS.map((p) => data.tools.find((t) => t.id === stack[p])).filter(
    (t): t is Tool => t !== undefined,
  );
  const { issues, bonuses } = applyRules(stack, challenge, data);
  const steps = buildSteps(stack, issues, bonuses, data);
  const passed = !issues.some((i) => i.severity === "error");
  const { score, breakdown } = computeScore({ passed, tools, issues, bonuses, challenge });

  const failedStep = steps.find((s) => s.status === "fail");
  const roastCtx = {
    stack,
    tools,
    challenge,
    passed,
    score,
    issues,
    failedPhase: data.phases.find((p) => p.id === failedStep?.phase) ?? null,
  };
  const roast = pickRoast(roastCtx);
  const burns = pickBurns(roastCtx);

  const avg = tools.length ? tools.reduce((s, t) => s + t.difficulty, 0) / tools.length : 0;
  return {
    passed,
    steps,
    issues,
    bonuses,
    score,
    breakdown,
    roast,
    burns,
    stats: {
      toolCount: tools.length,
      avgDifficulty: Math.round(avg * 10) / 10,
      monthlyCostHint: monthlyCostHint(tools),
    },
  };
}
