import { cn } from "@/utils/cn";

describe("cn", () => {
  it("joins truthy classes and drops falsy ones", () => {
    expect(cn("px-4", false && "hidden", undefined, "py-2")).toBe("px-4 py-2");
  });

  it("lets the later tailwind class win on conflict", () => {
    expect(cn("px-4 text-gray-500", "px-6")).toBe("text-gray-500 px-6");
  });
});
