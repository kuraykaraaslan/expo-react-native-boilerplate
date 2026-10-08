import { notificationTarget } from "@/utils/notification";

const FE = "https://app.example.com";

describe("notificationTarget", () => {
  it("keeps an absolute https action url", () => {
    expect(notificationTarget({ action: { label: "Open", url: "https://billing.example.com/inv/1" } }, FE)).toBe("https://billing.example.com/inv/1");
  });

  it("resolves a web path against the frontend url, preferring action.url over path", () => {
    expect(notificationTarget({ path: "/admin/invoices" }, FE)).toBe("https://app.example.com/admin/invoices");
    expect(notificationTarget({ path: "/a", action: { label: "x", url: "/b" } }, `${FE}/`)).toBe("https://app.example.com/b");
  });

  it("returns null for nothing, or for a non-web scheme", () => {
    expect(notificationTarget({}, FE)).toBeNull();
    expect(notificationTarget({ path: "   " }, FE)).toBeNull();
    expect(notificationTarget({ action: { label: "x", url: "javascript:alert(1)" } }, FE)).toBeNull();
    expect(notificationTarget({ action: { label: "x", url: "intent://x#Intent;end" } }, FE)).toBeNull();
  });
});
