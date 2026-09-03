import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { motionTokens } from "@/preview/motion-system";

describe("Preview motion system", () => {
  it("centralizes restrained timing and reduced-motion support", () => {
    expect(motionTokens.immediate).toBeGreaterThanOrEqual(0.08);
    expect(motionTokens.fast).toBeLessThanOrEqual(0.18);
    expect(motionTokens.normal).toBeGreaterThanOrEqual(0.2);
    expect(motionTokens.expressive).toBeLessThanOrEqual(0.45);
    const source = readFileSync("src/preview/motion-system.tsx", "utf8");
    expect(source).toContain('reducedMotion="user"');
    expect(source).toContain("useReducedMotion");
    expect(source).toContain("cancelAnimationFrame");
  });

  it("uses accessible skeletons and route-keyed content transitions without persistence", () => {
    const app = readFileSync("src/preview/preview-app.tsx", "utf8");
    const styles = readFileSync("src/app/motion.css", "utf8");
    expect(app).toContain("LoadingSkeleton");
    expect(app).toContain("PageTransition routeKey={pathname}");
    expect(styles).toContain("@media(prefers-reduced-motion:reduce)");
    expect(styles).not.toContain("transition:all");
  });

  it("keeps overlay, schedule, and map motion presentation-only", () => {
    const overlay = readFileSync("src/preview/rich-operational-workspaces.tsx", "utf8");
    const schedule = readFileSync("src/preview/schedule-workspace.tsx", "utf8");
    const map = readFileSync("src/preview/interactive-planning-map.tsx", "utf8");
    expect(overlay).toContain("event.key === \"Escape\"");
    expect(overlay).toContain("role=\"dialog\"");
    expect(schedule).toContain("motion-schedule-layout");
    expect(map).toContain("LoadingSkeleton variant=\"map\"");
    expect(map).not.toMatch(/fetch\(|geolocation|DATABASE_URL|BLOB_/);
  });
});
