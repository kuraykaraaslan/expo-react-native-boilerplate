import { searchTarget } from "@/libs/searchRoutes";
import { SEARCH_PAGE_SIZE, SearchClientService } from "@/services/platform/search.service.client";
import { humanizeEntityType, parseSnippet } from "@/utils/search";
import { TENANT_ID } from "./fixtures";
import { mockRoute, signIn } from "./_helpers";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

const FRONTEND = "https://app.example.com";
const hit = { entityType: "PAGE", entityId: "p1", title: "Pricing", url: "/pricing", snippet: "see <b>pricing</b> now", rank: 0.4, metadata: null };

describe("parseSnippet", () => {
  it("marks the match and keeps the rest plain", () => {
    expect(parseSnippet("see <b>pricing</b> now")).toEqual([
      { text: "see ", bold: false },
      { text: "pricing", bold: true },
      { text: " now", bold: false },
    ]);
  });
  it("drops any other markup and decodes entities instead of rendering HTML", () => {
    expect(parseSnippet('<script>alert(1)</script>a &amp; b')).toEqual([{ text: "alert(1)a & b", bold: false }]);
    expect(parseSnippet("")).toEqual([]);
  });
});

describe("humanizeEntityType", () => {
  it("makes a readable label for an untranslated type", () => {
    expect(humanizeEntityType("CRM_LEAD")).toBe("Crm lead");
  });
});

describe("searchTarget", () => {
  it("opens the web page in the in-app browser when the type has no app screen", () => {
    expect(searchTarget(hit, FRONTEND)).toEqual({ kind: "web", url: "https://app.example.com/pricing" });
  });
  it("refuses non-http(s) schemes and missing urls", () => {
    expect(searchTarget({ ...hit, url: "javascript:alert(1)" }, FRONTEND)).toEqual({ kind: "none" });
    expect(searchTarget({ ...hit, url: null }, FRONTEND)).toEqual({ kind: "none" });
  });
});

describe("SearchClientService", () => {
  beforeEach(() => signIn(TENANT_ID));

  it("sends the query with paging and parses hits", async () => {
    const seen = mockRoute("get", "/search", { hits: [hit], total: 31 });
    const res = await SearchClientService.search("pricing", { offset: 20 });
    expect(res.total).toBe(31);
    expect(seen[0].query).toEqual({ q: "pricing", limit: String(SEARCH_PAGE_SIZE), offset: "20" });
  });

  it("round-trips saved searches and history", async () => {
    mockRoute("get", "/search/history", { data: [{ searchQueryLogId: "l1", query: "pricing", entityType: null, resultCount: 3, createdAt: "2026-10-01T10:00:00.000Z" }] });
    expect((await SearchClientService.getHistory())[0].query).toBe("pricing");

    const created = mockRoute("post", "/search/saved", () => ({ body: { item: { savedSearchId: "s1", name: "pricing", query: "pricing", entityType: null, createdAt: "2026-10-01T10:00:00.000Z" } }, init: { status: 201 } }));
    const item = await SearchClientService.save({ name: "pricing", query: "pricing" });
    expect(item.savedSearchId).toBe("s1");
    expect(created[0].body).toEqual({ name: "pricing", query: "pricing" });

    const del = mockRoute("delete", "/search/saved/s1", { success: true });
    await SearchClientService.deleteSaved("s1");
    expect(del).toHaveLength(1);
  });

  it("rejects an empty saved-search name before any request", async () => {
    const seen = mockRoute("post", "/search/saved", { item: {} });
    await expect(SearchClientService.save({ name: "", query: "x" })).rejects.toThrow();
    expect(seen).toHaveLength(0);
  });
});
