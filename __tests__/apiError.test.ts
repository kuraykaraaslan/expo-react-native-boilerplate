import { normalizeApiError } from "@/libs/apiError";

/** An axios-like rejection carrying a server response. */
function responseError(status: number, data: unknown, headers: Record<string, string> = {}) {
  return { isAxiosError: true, message: `Request failed with status code ${status}`, response: { status, data, headers } };
}

describe("normalizeApiError — next-boilerplate's four error bodies", () => {
  it("1. AppError { message, code }: keeps code, translates known constants", () => {
    const e = normalizeApiError(responseError(401, { message: "INVALID_CREDENTIALS", code: "UNAUTHORIZED" }));
    expect(e).toMatchObject({ rawMessage: "INVALID_CREDENTIALS", code: "UNAUTHORIZED", statusCode: 401 });
    expect(e.message).toBe("Email or password is incorrect.");
  });

  it("2. ZodError { message: 'Validation error', issues }: first issue with its field", () => {
    const e = normalizeApiError(
      responseError(400, { message: "Validation error", issues: [{ path: ["email"], message: "Invalid email" }] }),
    );
    expect(e.message).toBe("email: Invalid email");
    expect(e.issues).toHaveLength(1);
  });

  it("3. { error: '<string>' }: the server sentence as-is", () => {
    const e = normalizeApiError(responseError(403, { error: "You are not a member of this organization" }));
    expect(e.message).toBe("You are not a member of this organization");
    expect(e.statusCode).toBe(403);
  });

  it("4. { error: [issues] } (device login 400): first issue", () => {
    const e = normalizeApiError(responseError(400, { error: [{ path: ["password"], message: "Required" }] }));
    expect(e.message).toBe("password: Required");
  });
});

describe("normalizeApiError — edge cases", () => {
  it("429 reads Retry-After", () => {
    const e = normalizeApiError(responseError(429, { message: "Too many requests" }, { "retry-after": "30" }));
    expect(e.retryAfter).toBe(30);
    expect(e.message).toBe("Too many requests. Try again in 30 seconds.");
  });

  it("unknown SCREAMING_CASE constants are not shown to the user", () => {
    expect(normalizeApiError(responseError(500, { message: "SOME_INTERNAL_CODE" })).message).toBe("An unexpected error occurred");
  });

  it("no response → network message", () => {
    expect(normalizeApiError({ isAxiosError: true, message: "Network Error" }).message).toBe(
      "Can't reach the server. Check your connection and try again.",
    );
  });

  it("plain Error and unknown values", () => {
    expect(normalizeApiError(new Error("boom")).message).toBe("boom");
    expect(normalizeApiError("??").message).toBe("An unexpected error occurred");
  });
});
