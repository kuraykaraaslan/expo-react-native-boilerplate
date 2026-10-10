import { MessagingClientService } from "@/services/platform/messaging.service.client";
import { useMessagingStore } from "@/stores/messagingStore";
import { canManageParticipants, compareNewestFirst, conversationTitle, sortParticipants, withParticipant, mergeMessages, sortConversations, totalUnread, upsertMessage } from "@/utils/messaging";
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

  it("a confirmed send is deduped by id with its socket echo, whichever arrives first", () => {
    const s = useMessagingStore.getState();
    s.setConversations([conv("c1")]);
    const real = msg("m1", "2026-10-01T10:00:01Z", { senderUserId: "me", body: "hi", clientNonce: "n1" });
    s.receiveMessage(real, { fromMe: true, open: true }); // echo first
    s.confirmSent(real); // then the REST answer
    const state = useMessagingStore.getState();
    expect(state.messages.c1.map((m) => m.messageId)).toEqual(["m1"]);
    expect(state.conversations[0].lastMessagePreview).toBe("hi");
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
    const first = await MessagingClientService.sendMessage("c1", { body: "hi", clientNonce: "n1" });
    expect(first.replayed).toBe(false);
    expect(sent[0].body).toEqual({ body: "hi", clientNonce: "n1" });
    const report = mockRoute("post", "/conversations/c1/messages/m1/report", () => ({ body: { report: {} }, init: { status: 201 } }));
    await MessagingClientService.reportMessage("c1", "m1", "spam");
    expect(report[0].body).toEqual({ reason: "spam" });
  });

  it("reads a replayed send (200, replayed: true) as the original message", async () => {
    mockRoute("post", "/conversations/c1/messages", () => ({ body: { message: msg("m1", "2026-10-01T10:00:00Z", { clientNonce: "n1" }), replayed: true }, init: { status: 200 } }));
    const out = await MessagingClientService.sendMessage("c1", { body: "hi", clientNonce: "n1" });
    expect(out).toMatchObject({ replayed: true, message: { messageId: "m1", clientNonce: "n1" } });
  });

  it("validates a direct conversation needs exactly one other person", async () => {
    const seen = mockRoute("post", "/conversations", { conversation: conv("c1") });
    await expect(MessagingClientService.createConversation({ type: "direct", participantUserIds: ["a", "b"] })).rejects.toThrow();
    expect(seen).toHaveLength(0);
  });
});

describe("group conversations", () => {
  it("creates a group with a title and several people", async () => {
    // The server's create route answers with the bare conversation (no participants).
    const seen = mockRoute("post", "/conversations", () => ({ body: { conversation: { conversationId: "g1", type: "group", title: "Team" } }, init: { status: 201 } }));
    const detail = mockRoute("get", "/conversations/g1", { conversation: { conversationId: "g1", type: "group", title: "Team", participants: [{ userId: "me", role: "owner" }, { userId: "a", role: "member" }] } });
    const created = await MessagingClientService.createConversation({ type: "group", title: "Team", participantUserIds: ["a", "b"] });
    expect(seen[0].body).toEqual({ type: "group", title: "Team", participantUserIds: ["a", "b"] });
    expect(detail).toHaveLength(1);
    expect(created.type).toBe("group");
    expect(canManageParticipants(created, "me")).toBe(true); // creator is the owner, known from the detail fetch
  });

  it("refuses a group without a title before any request", async () => {
    const seen = mockRoute("post", "/conversations", { conversation: conv("g1") });
    await expect(MessagingClientService.createConversation({ type: "group", participantUserIds: ["a"] })).rejects.toThrow();
    expect(seen).toHaveLength(0);
  });

  it("adds a participant with the member role by default", async () => {
    const seen = mockRoute("post", "/conversations/g1/participants", () => ({ body: { participant: { userId: "u9", role: "member" } }, init: { status: 201 } }));
    const p = await MessagingClientService.addParticipant("g1", { userId: "u9" });
    expect(seen[0].body).toEqual({ userId: "u9", role: "member" });
    expect(p).toMatchObject({ userId: "u9", role: "member" });
  });

  it("surfaces a conflict when the person is already in the group", async () => {
    mockRoute("post", "/conversations/g1/participants", () => ({ body: { message: "Already a participant." }, init: { status: 409 } }));
    await expect(MessagingClientService.addParticipant("g1", { userId: "u2" })).rejects.toBeTruthy();
  });

  it("lets only a group's owner or admin manage people", () => {
    const group = (role: string) => conv("g1", { type: "group", participants: [{ userId: "me", role }, { userId: "u2", role: "owner" }] });
    expect(canManageParticipants(group("owner"), "me")).toBe(true);
    expect(canManageParticipants(group("admin"), "me")).toBe(true);
    expect(canManageParticipants(group("member"), "me")).toBe(false);
    expect(canManageParticipants(conv("d1", { participants: [{ userId: "me", role: "owner" }] }), "me")).toBe(false);
    expect(canManageParticipants(group("owner"), undefined)).toBe(false);
  });

  it("adds a participant once and orders the roster owner first", () => {
    const g = conv("g1", { type: "group", participants: [{ userId: "b", role: "member" }, { userId: "a", role: "owner" }] });
    const next = withParticipant(withParticipant(g, { userId: "c", role: "member" }), { userId: "c", role: "admin" });
    expect(next.participants.filter((p) => p.userId === "c")).toEqual([{ userId: "c", role: "admin" }]);
    const names: Record<string, string> = { a: "Ann", b: "Bob", c: "Cy" };
    expect(sortParticipants(next.participants, (id) => names[id]).map((p) => p.userId)).toEqual(["a", "c", "b"]);
  });
});
