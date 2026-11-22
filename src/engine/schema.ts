// Zod schemas + TS types for every data file in /data.
// Pure TypeScript: no React, no DB, no Node-only imports. Runs in browser and server.
import { z } from "zod";

// ── Primitives ──────────────────────────────────────────────────────────────

export const PHASE_IDS = [
  "source",
  "ci",
  "build",
  "infra",
  "runtime",
  "cd",
  "secrets",
  "observe",
] as const;
export const PhaseIdSchema = z.enum(PHASE_IDS);
export type PhaseId = z.infer<typeof PhaseIdSchema>;

/** kebab-case id, e.g. "github-actions" */
const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case (a-z, 0-9, dashes)");

export const ToolIdSchema = Slug;
export type ToolId = string;

export const ScaleSchema = z.enum(["solo", "startup", "enterprise"]);
export type Scale = z.infer<typeof ScaleSchema>;

export const CostSchema = z.enum(["free", "freemium", "paid"]);
export type Cost = z.infer<typeof CostSchema>;

// ── phases.json ─────────────────────────────────────────────────────────────

export const PhaseSchema = z.strictObject({
  id: PhaseIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  allowNone: z.boolean(),
});
export type Phase = z.infer<typeof PhaseSchema>;
export const PhasesFileSchema = z.array(PhaseSchema);

// ── tools.json ──────────────────────────────────────────────────────────────

export const ToolSchema = z.strictObject({
  id: ToolIdSchema,
  name: z.string().min(1),
  phase: PhaseIdSchema,
  description: z.string().min(1).max(160),
  use: z.string().min(1).max(160),
  cost: CostSchema,
  difficulty: z.int().min(1).max(5),
  selfHosted: z.boolean(),
  /** capabilities this tool gives the stack, e.g. "kubernetes", "container-image" */
  provides: z.array(Slug),
  website: z.url(),
  logo: z.string().regex(/^\/logos\/[a-z0-9-]+\.(svg|png)$/, "must look like /logos/<name>.svg"),
});
export type Tool = z.infer<typeof ToolSchema>;
export const ToolsFileSchema = z.array(ToolSchema);

// ── rules.json ──────────────────────────────────────────────────────────────

/** Condition on the challenge. All listed keys must match (AND); within a key, any value (OR). */
export const ConditionSchema = z
  .strictObject({
    scales: z.array(ScaleSchema).min(1).optional(),
    tags: z.array(Slug).min(1).optional(),
  })
  .refine((c) => c.scales || c.tags, "condition needs at least one of scales or tags");
export type Condition = z.infer<typeof ConditionSchema>;

const RuleBase = {
  id: Slug,
  message: z.string().min(1).max(200),
};

/** Tool A needs at least one of these tools or capabilities somewhere in the stack. */
export const RequiresRuleSchema = z.strictObject({
  ...RuleBase,
  type: z.literal("requires"),
  tool: ToolIdSchema,
  needs: z
    .strictObject({
      tools: z.array(ToolIdSchema).min(1).optional(),
      capabilities: z.array(Slug).min(1).optional(),
    })
    .refine((n) => n.tools || n.capabilities, "needs must list tools or capabilities"),
  severity: z.literal("error"),
});

/** A and B together don't make sense. */
export const ConflictsRuleSchema = z.strictObject({
  ...RuleBase,
  type: z.literal("conflicts"),
  tools: z.tuple([ToolIdSchema, ToolIdSchema]),
  severity: z.literal("error"),
});

/** A and B work great together. */
export const PairsWellRuleSchema = z.strictObject({
  ...RuleBase,
  type: z.literal("pairs_well"),
  tools: z.tuple([ToolIdSchema, ToolIdSchema]),
  severity: z.literal("bonus"),
  bonus: z.number().min(0).max(5).default(1),
});

/** Tool is too heavy for the challenge. */
export const OverkillRuleSchema = z.strictObject({
  ...RuleBase,
  type: z.literal("overkill"),
  tool: ToolIdSchema,
  when: ConditionSchema,
  severity: z.literal("warning"),
});

/** Phase left empty that the challenge expects. */
export const MissingRuleSchema = z.strictObject({
  ...RuleBase,
  type: z.literal("missing"),
  phase: PhaseIdSchema,
  when: ConditionSchema,
  severity: z.enum(["warning", "error"]),
});

/** Risky choice. Optional `when` limits it to certain challenges. */
export const InsecureRuleSchema = z.strictObject({
  ...RuleBase,
  type: z.literal("insecure"),
  tool: ToolIdSchema,
  when: ConditionSchema.optional(),
  severity: z.literal("warning"),
});

export const RuleSchema = z.discriminatedUnion("type", [
  RequiresRuleSchema,
  ConflictsRuleSchema,
  PairsWellRuleSchema,
  OverkillRuleSchema,
  MissingRuleSchema,
  InsecureRuleSchema,
]);
export type Rule = z.infer<typeof RuleSchema>;
export type RuleType = Rule["type"];
export type Severity = Rule["severity"];
export const RulesFileSchema = z.array(RuleSchema);

// ── challenges.json ─────────────────────────────────────────────────────────

export const WeightsSchema = z
  .strictObject({
    valid: z.number().min(0),
    simplicity: z.number().min(0),
    cost: z.number().min(0),
    coverage: z.number().min(0),
    bestPractice: z.number().min(0),
  })
  .refine(
    (w) => w.valid + w.simplicity + w.cost + w.coverage + w.bestPractice === 100,
    "weights must add up to 100",
  );
export type Weights = z.infer<typeof WeightsSchema>;

export const ChallengeSchema = z.strictObject({
  id: Slug,
  title: z.string().min(1),
  brief: z.string().min(1),
  scale: ScaleSchema,
  /** rough monthly budget in USD */
  budget: z.number().min(0),
  tags: z.array(Slug),
  mustHave: z.array(PhaseIdSchema),
  niceToHave: z.array(PhaseIdSchema),
  weights: WeightsSchema,
});
export type Challenge = z.infer<typeof ChallengeSchema>;
export const ChallengesFileSchema = z.array(ChallengeSchema);

// ── All data together ───────────────────────────────────────────────────────

export interface Data {
  phases: Phase[];
  tools: Tool[];
  rules: Rule[];
  challenges: Challenge[];
}

// ── Engine I/O types (implemented in M2) ────────────────────────────────────

export type Stack = Record<PhaseId, ToolId | null>;

export const StackSchema = z.strictObject(
  Object.fromEntries(PHASE_IDS.map((p) => [p, ToolIdSchema.nullable()])) as Record<
    PhaseId,
    z.ZodNullable<typeof ToolIdSchema>
  >,
);

export interface Issue {
  ruleId: string;
  type: RuleType;
  severity: "error" | "warning";
  phase: PhaseId;
  tool: ToolId | null;
  message: string;
}

/** A `pairs_well` rule that matched. */
export interface Bonus {
  ruleId: string;
  tools: [ToolId, ToolId];
  bonus: number;
  message: string;
}

export interface RunStep {
  phase: PhaseId;
  tool: ToolId | null;
  status: "ok" | "warn" | "fail" | "skipped";
  messages: string[];
}

export interface RunResult {
  passed: boolean;
  steps: RunStep[];
  issues: Issue[];
  bonuses: Bonus[];
  score: number;
  breakdown: Record<keyof Weights, number>;
  roast: string;
  stats: { toolCount: number; avgDifficulty: number; monthlyCostHint: string };
}
