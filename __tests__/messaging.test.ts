import { MessagingClientService } from "@/services/platform/messaging.service.client";
import { useMessagingStore } from "@/stores/messagingStore";
import { compareNewestFirst, conversationTitle, mergeMessages, sortConversations, totalUnread, upsertMessage } from "@/utils/messaging";
import type { Conversation, Message } from "@/services/platform/messaging.dto";
import { TENANT_ID } from "./fixtures";
import { mockRoute, signIn } from "./_helpers";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

const msg = (id: string, at: string, over: Partial<Message> = {}): Message => ({
  messageId: id,
  conversationId: "c1",
  senderUserId: "u2",
  body: `body ${id}`,
  contentType: "text",
  moderationStatus: "CLEAN",
  createdAt: at,
  ...over,
});
const conv = (id: string, over: Partial<Conversation> = {}): Conversation => ({
  conversationId: id,
  type: "direct",
  title: null,
  lastMessageAt: null,
  lastMessagePreview: null,
  unreadCount: 0,
  participants: [{ userId: "me", role: "member" }, { userId: "u2", role: "member" }],
  ...over,
});

beforeEach(() => useMessagingStore.getState().reset());

describe("message ordering", () => {
  it("sorts newest first and breaks ties by id", () => {
    const a = msg("a", "2026-10-01T10:00:00Z");
    const b = msg("b", "2026-10-01T10:00:01Z");
    expect([a, b].sort(compareNewestFirst).map((m) => m.messageId)).toEqual(["b", "a"]);
    const c = msg("c", "2026-10-01T10:00:00Z");
    expect([a, c].sort(compareNewestFirst).map((m) => m.messageId)).toEqual(["c", "a"]);
  });

  it("upsert and merge never duplicate a message (socket echo + REST)", () => {
    const a = msg("a", "2026-10-01T10:00:00Z");
    expect(upsertMessage(upsertMessage([], a), { ...a, moderationStatus: "FLAGGED" })).toHaveLength(1);
    expect(mergeMessages([a], [a, msg("b", "2026-10-01T10:01:00Z")]).map((m) => m.messageId)).toEqual(["b", "a"]);
  });
});

describe("conversation helpers", () => {
  it("orders by last activity and puts empty conversations last", () => {
    const list = sortConversations([conv("old", { lastMessageAt: "2026-10-01T09:00:00Z" }), conv("none"), conv("new", { lastMessageAt: "2026-10-01T11:00:00Z" })]);
    expect(list.map((c) => c.conversationId)).toEqual(["new", "old", "none"]);
  });

  it("names a direct conversation after the other person, a group by its title", () => {
    const names: Record<string, string> = { u2: "Ada" };
    expect(conversationTitle(conv("d"), "me", (id) => names[id], "Someone")).toBe("Ada");
    expect(conversationTitle(conv("g", { type: "group", title: "Team" }), "me", (id) => names[id], "Someone")).toBe("Team");
    expect(conversationTitle(conv("x"), "me", () => undefined, "Someone")).toBe("Someone");
  });

  it("sums unread counts", () => {
    expect(totalUnread([conv("a", { unreadCount: 2 }), conv("b", { unreadCount: 3 })])).toBe(5);
  });
});

describe("messaging store", () => {
  it("counts an incoming message as unread unless it is mine or the thread is open", () => {
    const s = useMessagingStore.getState();
    s.setConversations([conv("c1")]);
    s.receiveMessage(msg("m1", "2026-10-01T10:00:00Z"), { fromMe: false, open: false });
    expect(useMessagingStore.getState().conversations[0].unreadCount).toBe(1);
    s.receiveMessage(msg("m2", "2026-10-01T10:00:01Z"), { fromMe: false, open: true });
    s.receiveMessage(msg("m3", "2026-10-01T10:00:02Z", { senderUserId: "me" }), { fromMe: true, open: false });
    expect(useMessagingStore.getState().conversations[0].unreadCount).toBe(1);
    expect(useMessagingStore.getState().messages.c1).toHaveLength(3);
    expect(useMessagingStore.getState().conversations[0].lastMessagePreview).toBe("body m3");
  });

  it("an optimistic send is replaced by the confirmed message, even when the socket echo came first", () => {
    const s = useMessagingStore.getState();
    s.setConversations([conv("c1")]);
    s.addPending({ nonce: "n1", conversationId: "c1", body: "hi", createdAt: "2026-10-01T10:00:00Z", status: "sending" });
    const real = msg("m1", "2026-10-01T10:00:01Z", { senderUserId: "me", body: "hi" });
    s.receiveMessage(real, { fromMe: true, open: true }); // echo first
    s.settlePending("n1", real); // then the REST answer
    const state = useMessagingStore.getState();
    expect(state.pending).toEqual([]);
    expect(state.messages.c1.map((m) => m.messageId)).toEqual(["m1"]);
  });

  it("a send confirmed after the store was reset (tenant switch) is dropped, not leaked into the new tenant", () => {
    const s = useMessagingStore.getState();
    s.addPending({ nonce: "n1", conversationId: "c1", body: "hi", createdAt: "2026-10-01T10:00:00Z", status: "sending" });
    s.reset();
    s.settlePending("n1", msg("m1", "2026-10-01T10:00:01Z"));
    expect(useMessagingStore.getState().messages.c1).toBeUndefined();
  });

  it("a failed send stays for retry and goes back to sending", () => {
    const s = useMessagingStore.getState();
    s.addPending({ nonce: "n1", conversationId: "c1", body: "hi", createdAt: "2026-10-01T10:00:00Z", status: "sending" });
    s.failPending("n1");
    expect(useMessagingStore.getState().pending[0].status).toBe("failed");
    s.retryPending("n1");
    expect(useMessagingStore.getState().pending[0].status).toBe("sending");
    s.settlePending("n1", null); // gave up
    expect(useMessagingStore.getState().pending).toEqual([]);
  });

  it("typing expires and can be cleared; reset forgets everything", () => {
    const s = useMessagingStore.getState();
    s.setTyping("c1", "u2", true, 1000);
    expect(useMessagingStore.getState().typing.c1.u2).toBeGreaterThan(1000);
    s.setTyping("c1", "u2", false);
    expect(useMessagingStore.getState().typing.c1.u2).toBeUndefined();
    s.setConversations([conv("c1")]);
    s.reset();
    expect(useMessagingStore.getState().conversations).toEqual([]);
    expect(useMessagingStore.getState().conversationsLoaded).toBe(false);
  });

  it("a backfill of the newest page does not rewind the paging cursor", () => {
    const s = useMessagingStore.getState();
    s.mergeThread("c1", [msg("a", "2026-10-01T10:00:00Z")], "cursor-1");
    s.mergeThread("c1", [msg("b", "2026-10-01T10:01:00Z")]);
    expect(useMessagingStore.getState().olderCursor.c1).toBe("cursor-1");
  });
});

describe("MessagingClientService", () => {
  beforeEach(() => signIn(TENANT_ID));

  it("mints a ticket and reads where to connect", async () => {
    mockRoute("post", "/messaging/ws-ticket", () => ({ body: { ticket: "t1", expiresIn: 30, wsUrl: "wss://ws.example.com", path: "/messaging" }, init: { status: 201 } }));
    await expect(MessagingClientService.createWsTicket()).resolves.toMatchObject({ ticket: "t1", wsUrl: "wss://ws.example.com", path: "/messaging" });
  });

  it("lists conversations and messages with cursors", async () => {
    mockRoute("get", "/conversations", { conversations: [{ ...conv("c1"), createdAt: "x" }], nextCursor: "n1" });
    expect(await MessagingClientService.listConversations()).toMatchObject({ nextCursor: "n1" });
    const seen = mockRoute("get", "/conversations/c1/messages", { messages: [msg("a", "2026-10-01T10:00:00Z")], nextCursor: null });
    const page = await MessagingClientService.listMessages("c1", { cursor: "n0" });
    expect(page.nextCursor).toBeNull();
    expect(seen[0].query).toMatchObject({ cursor: "n0", limit: "30" });
  });

  it("sends with a client nonce and reports a message", async () => {
    const sent = mockRoute("post", "/conversations/c1/messages", () => ({ body: { message: msg("m1", "2026-10-01T10:00:00Z") }, init: { status: 201 } }));
    await MessagingClientService.sendMessage("c1", { body: "hi", clientNonce: "n1" });
    expect(sent[0].body).toEqual({ body: "hi", clientNonce: "n1" });
    const report = mockRoute("post", "/conversations/c1/messages/m1/report", () => ({ body: { report: {} }, init: { status: 201 } }));
    await MessagingClientService.reportMessage("c1", "m1", "spam");
    expect(report[0].body).toEqual({ reason: "spam" });
  });

  it("validates a direct conversation needs exactly one other person", async () => {
    const seen = mockRoute("post", "/conversations", { conversation: conv("c1") });
    await expect(MessagingClientService.createConversation({ type: "direct", participantUserIds: ["a", "b"] })).rejects.toThrow();
    expect(seen).toHaveLength(0);
  });
});
