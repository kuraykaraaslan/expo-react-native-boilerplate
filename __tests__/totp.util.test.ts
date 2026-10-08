import { formatSecret, isCompleteCode, sanitizeCode } from "@/utils/totp";

describe("totp helpers", () => {
  it("groups the secret in fours and ignores existing spaces", () => {
    expect(formatSecret("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP");
    expect(formatSecret("JBSW Y3DP EH")).toBe("JBSW Y3DP EH");
    expect(formatSecret("")).toBe("");
  });

  it("sanitizes the code input to at most six digits", () => {
    expect(sanitizeCode("12a3 456789")).toBe("123456");
    expect(sanitizeCode("abc")).toBe("");
  });

  it("accepts exactly six digits", () => {
    expect(isCompleteCode("123456")).toBe(true);
    expect(isCompleteCode("12345")).toBe(false);
    expect(isCompleteCode("1234567")).toBe(false);
    expect(isCompleteCode("12345a")).toBe(false);
  });
});
