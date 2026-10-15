import { describe, expect, it } from "vitest";
import { displayText } from "@/shared/presentation/display-text";

describe("Visible text typography", () => {
  it("formats stored prose without rewriting the source record", () => {
    const source = { address: "Fictional demonstration site \u2014 Abu Dhabi branch" };
    expect(displayText(source.address)).toBe("Fictional demonstration site · Abu Dhabi branch");
    expect(source.address).toBe("Fictional demonstration site \u2014 Abu Dhabi branch");
  });
  it("replaces a retained missing-value placeholder with meaningful text", () => {
    expect(displayText(" \u2014 ")).toBe("Not recorded");
  });
  it("keeps time-range dashes, minus signs, numbers and absent values intact", () => {
    expect(displayText("09:00–11:00 · -2 days")).toBe("09:00–11:00 · -2 days");
    expect(displayText(0)).toBe(0); expect(displayText(null)).toBeNull(); expect(displayText(undefined)).toBeUndefined();
  });
});
