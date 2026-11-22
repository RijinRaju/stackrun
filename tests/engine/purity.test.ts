import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(import.meta.dirname, "../../src/engine");
const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));

describe("engine purity", () => {
  it("imports nothing but zod, its own modules and the data files", () => {
    for (const f of files) {
      const src = readFileSync(join(dir, f), "utf8");
      const imports = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]!);
      for (const spec of imports) {
        expect(spec, `${f} imports "${spec}"`).toMatch(/^(zod$|\.\/|\.\.\/\.\.\/data\/)/);
      }
    }
  });

  it("uses no randomness or clock (keeps scores deterministic)", () => {
    for (const f of files) {
      const src = readFileSync(join(dir, f), "utf8");
      expect(src, f).not.toMatch(/Math\.random|Date\.now|new Date\(/);
    }
  });
});
