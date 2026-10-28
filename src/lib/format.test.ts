import { describe, expect, it } from "vitest";
import { bestMonthsLabel } from "./format";

const g = "great", o = "good", m = "mixed", p = "poor";

describe("bestMonthsLabel", () => {
  it("joins a range that wraps past December", () => {
    expect(bestMonthsLabel([g, g, g, o, m, m, m, m, m, p, p, g])).toBe("Dec–Mar");
  });
  it("lists separate ranges", () => {
    expect(bestMonthsLabel([g, g, g, m, p, p, m, g, g, p, p, m])).toBe("Jan–Mar, Aug–Sep");
  });
  it("falls back to good months when none are great", () => {
    expect(bestMonthsLabel([o, o, m, m, m, m, m, m, m, m, m, m])).toBe("Jan–Feb");
  });
  it("handles all-year and single months", () => {
    expect(bestMonthsLabel(Array(12).fill(g))).toBe("All year");
    expect(bestMonthsLabel([p, p, p, p, p, g, p, p, p, p, p, p])).toBe("Jun");
  });
});
