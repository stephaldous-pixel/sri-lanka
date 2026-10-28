import { describe, expect, it } from "vitest";
import { addDays, daysInclusive, formatRange, monthGrid } from "./dates";

describe("dates", () => {
  it("counts trip days inclusively, across months and leap years", () => {
    expect(daysInclusive("2027-02-03", "2027-02-16")).toBe(14);
    expect(daysInclusive("2027-02-03", "2027-02-03")).toBe(1);
    expect(daysInclusive("2028-02-27", "2028-03-01")).toBe(4); // 2028 is a leap year
    expect(daysInclusive("2026-12-28", "2027-01-03")).toBe(7);
  });

  it("adds days across month ends", () => {
    expect(addDays("2027-01-31", 1)).toBe("2027-02-01");
  });

  it("lays out a month Monday-first with blanks", () => {
    const feb2027 = monthGrid(2027, 1); // 1 Feb 2027 is a Monday
    expect(feb2027[0][0]).toBe("2027-02-01");
    expect(feb2027).toHaveLength(4);
    const mar2027 = monthGrid(2027, 2); // 1 Mar 2027 is a Monday too; 31 days → 5 weeks
    expect(mar2027.flat().filter(Boolean)).toHaveLength(31);
    const aug2027 = monthGrid(2027, 7); // 1 Aug 2027 is a Sunday
    expect(aug2027[0].slice(0, 6).every((c) => c === null)).toBe(true);
    expect(aug2027[0][6]).toBe("2027-08-01");
  });

  it("formats ranges compactly", () => {
    expect(formatRange("2027-02-03", "2027-02-16")).toBe("3–16 Feb");
    expect(formatRange("2027-02-28", "2027-03-13")).toBe("28 Feb – 13 Mar");
    expect(formatRange("2026-12-28", "2027-01-10")).toBe("28 Dec 2026 – 10 Jan 2027");
  });
});
