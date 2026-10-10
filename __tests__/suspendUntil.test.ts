import { parseSuspendUntil } from "@/utils/suspendUntil";

const NOW = new Date(2026, 9, 10, 12, 0, 0).getTime();

describe("parseSuspendUntil", () => {
  it("treats an empty field as an open-ended suspension", () => {
    expect(parseSuspendUntil("", NOW)).toEqual({ ok: true, iso: undefined });
    expect(parseSuspendUntil("   ", NOW)).toEqual({ ok: true, iso: undefined });
  });

  it("accepts a future date and ends it at the close of that day", () => {
    const res = parseSuspendUntil("2026-10-20", NOW);
    expect(res.ok).toBe(true);
    if (res.ok) expect(new Date(res.iso as string).getTime()).toBe(new Date(2026, 9, 20, 23, 59, 59).getTime());
  });

  it("accepts today (the suspension runs through the end of the day)", () => {
    expect(parseSuspendUntil("2026-10-10", NOW).ok).toBe(true);
  });

  it("rejects past, malformed and non-existent dates", () => {
    expect(parseSuspendUntil("2026-10-09", NOW).ok).toBe(false);
    expect(parseSuspendUntil("10/20/2026", NOW).ok).toBe(false);
    expect(parseSuspendUntil("2026-02-30", NOW).ok).toBe(false);
    expect(parseSuspendUntil("soon", NOW).ok).toBe(false);
  });
});
