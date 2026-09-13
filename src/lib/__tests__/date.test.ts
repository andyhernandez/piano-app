import { describe, expect, it } from "vitest";
import { addDays, daysBetween, weekDays, weekKey, isWeekend, formatDuration } from "../utils/date";

describe("date utils", () => {
  it("adds and diffs days across month ends", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
    expect(daysBetween("2026-03-01", "2026-02-28")).toBe(-1);
  });
  it("week starts Monday", () => {
    const days = weekDays("2026-03-04"); // Wednesday
    expect(days[0]).toBe("2026-03-02");
    expect(days[6]).toBe("2026-03-08");
    expect(weekKey("2026-03-04")).toBe(weekKey("2026-03-08"));
    expect(weekKey("2026-03-04")).not.toBe(weekKey("2026-03-09"));
  });
  it("weekend + duration", () => {
    expect(isWeekend("2026-03-07")).toBe(true);
    expect(isWeekend("2026-03-04")).toBe(false);
    expect(formatDuration(125)).toBe("2:05");
  });
});
