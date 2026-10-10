import { dayEndIso, dayStartIso, isValidDay, validateDayRange } from "@/utils/auditFilters";

describe("audit filter dates", () => {
  it("accepts real calendar days only", () => {
    expect(isValidDay("2026-10-10")).toBe(true);
    expect(isValidDay("2028-02-29")).toBe(true);
    expect(isValidDay("2026-02-31")).toBe(false);
    expect(isValidDay("2026-1-5")).toBe(false);
    expect(isValidDay("yesterday")).toBe(false);
    expect(isValidDay("")).toBe(false);
  });

  it("widens a day to its whole UTC day, and ignores blanks and invalid input", () => {
    expect(dayStartIso(" 2026-10-10 ")).toBe("2026-10-10T00:00:00.000Z");
    expect(dayEndIso("2026-10-10")).toBe("2026-10-10T23:59:59.999Z");
    expect(dayStartIso("")).toBeUndefined();
    expect(dayEndIso("2026-13-01")).toBeUndefined();
  });

  it("flags invalid fields and an inverted range", () => {
    expect(validateDayRange("", "")).toEqual({ from: null, to: null });
    expect(validateDayRange("2026-10-01", "2026-10-10")).toEqual({ from: null, to: null });
    expect(validateDayRange("2026-10-01", "2026-10-01")).toEqual({ from: null, to: null });
    expect(validateDayRange("nope", "2026-10-10")).toEqual({ from: "invalid", to: null });
    expect(validateDayRange("2026-10-10", "2026-10-01")).toEqual({ from: null, to: "range" });
  });
});
