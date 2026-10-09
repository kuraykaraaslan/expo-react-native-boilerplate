import { backfill, connectRealtime, disconnectRealtime, joinRoom, setOpenConversation } from "@/libs/realtime";
import { useAuthStore } from "@/stores/authStore";
import { useMessagingStore } from "@/stores/messagingStore";
import { useTenantStore } from "@/stores/tenantStore";
import { MessagingClientService } from "@/services/platform/messaging.service.client";
import { OTHER_TENANT_ID, TENANT_ID } from "./fixtures";
import { signIn } from "./_helpers";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

type Handler = (payload?: unknown) => void;

/** Just enough of socket.io-client's Socket: on/emit/disconnect/removeAllListeners. */
class MockSocket {
  private handlers = new Map<string, Handler[]>();
  connected = false;
  emitted: [string, unknown][] = [];
  url: string;
  opts: { auth: (cb: (a: { ticket: string }) => void) => void };
  constructor(url: string, opts: MockSocket["opts"]) {
    this.url = url;
    this.opts = opts;
  }
  on(event: string, handler: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }
  removeAllListeners() {
    this.handlers.clear();
    return this;
  }
  emit(event: string, ...args: unknown[]): boolean {
    this.emitted.push([event, args[0]]);
    return true;
  }
  /** What the server pushes. */
  push(event: string, payload?: unknown) {
    (this.handlers.get(event) ?? []).forEach((h) => h(payload));
  }
  disconnect() {
    this.connected = false;
    return this;
  }
}

const mockSockets: MockSocket[] = [];
jest.mock("socket.io-client", () => ({
  io: (url: string, opts: MockSocket["opts"]) => {
    const s = new MockSocket(url, opts);
    mockSockets.push(s);
    return s;
  },
}));

const ticket = (n: number) => ({ ticket: `t${n}`, expiresIn: 30, wsUrl: "wss://ws.example.com/", path: "/messaging" });
const message = (id: string, over: Record<string, unknown> = {}) => ({
  messageId: id,
  conversationId: "c1",
  senderUserId: "u2",
  body: "hello",
  contentType: "text",
  moderationStatus: "CLEAN",
  createdAt: "2026-10-01T10:00:00Z",
  ...over,
});

let minted = 0;
beforeEach(async () => {
  mockSockets.length = 0;
  minted = 0;
  disconnectRealtime();
  useMessagingStore.getState().reset();
  await signIn(TENANT_ID);
  useAuthStore.setState({ user: { userId: "me", email: "me@example.com" } as never });
  jest.spyOn(MessagingClientService, "createWsTicket").mockImplementation(async () => ticket(++minted));
  jest.spyOn(MessagingClientService, "listConversations").mockResolvedValue({ conversations: [], nextCursor: null });
  jest.spyOn(MessagingClientService, "listMessages").mockResolvedValue({ messages: [], nextCursor: null });
});
afterEach(() => {
  disconnectRealtime();
  jest.restoreAllMocks();
});

describe("connection", () => {
  it("connects to wsUrl + namespace with the first ticket, then mints a NEW ticket per reconnect", async () => {
    await connectRealtime(TENANT_ID);
    const s = mockSockets[0];
    expect(s.url).toBe("wss://ws.example.com/messaging");
    const used: string[] = [];
    s.opts.auth((a) => used.push(a.ticket)); // first handshake: the ticket we already hold
    s.opts.auth((a) => used.push(a.ticket)); // a reconnect: must be fresh
    await new Promise((r) => setTimeout(r, 0));
    expect(used).toEqual(["t1", "t2"]);
    expect(minted).toBe(2);
  });

  it("does not open a second socket for the same tenant", async () => {
    await connectRealtime(TENANT_ID);
    await connectRealtime(TENANT_ID);
    expect(mockSockets).toHaveLength(1);
  });

  it("a tenant switch closes the old socket, drops its rooms and ignores its late events", async () => {
    await connectRealtime(TENANT_ID);
    const old = mockSockets[0];
    joinRoom("c1");
    await connectRealtime(OTHER_TENANT_ID);
    expect(mockSockets).toHaveLength(2);
    old.push("message:new", message("late"));
    expect(useMessagingStore.getState().messages.c1).toBeUndefined();
    expect(useMessagingStore.getState().connection).toBe("connecting");
  });

  it("stays idle when the server has no gateway configured", async () => {
    jest.spyOn(MessagingClientService, "createWsTicket").mockResolvedValue({ ticket: "t", expiresIn: 30, wsUrl: null, path: "/messaging" });
    await connectRealtime(TENANT_ID);
    expect(mockSockets).toHaveLength(0);
    expect(useMessagingStore.getState().connection).toBe("idle");
  });

  it("disconnect closes the socket and goes idle", async () => {
    await connectRealtime(TENANT_ID);
    const s = mockSockets[0];
    const closed = jest.spyOn(s, "disconnect");
    disconnectRealtime();
    expect(closed).toHaveBeenCalled();
    expect(useMessagingStore.getState().connection).toBe("idle");
  });
});

describe("events", () => {
  it("re-joins its rooms and backfills on (re)connect", async () => {
    await connectRealtime(TENANT_ID);
    const s = mockSockets[0];
    joinRoom("c1"); // not connected yet: remembered, not sent
    expect(s.emitted).toEqual([]);
    s.connected = true;
    s.push("connect");
    expect(s.emitted).toContainEqual(["join", { conversationId: "c1" }]);
    expect(useMessagingStore.getState().connection).toBe("connected");
    await new Promise((r) => setTimeout(r, 0));
    expect(MessagingClientService.listConversations).toHaveBeenCalled();
  });

  it("puts a new message into the store, unread unless the thread is open", async () => {
    useMessagingStore.getState().setConversations([{ conversationId: "c1", type: "direct", title: null, lastMessageAt: null, lastMessagePreview: null, unreadCount: 0, participants: [] }]);
    await connectRealtime(TENANT_ID);
    const s = mockSockets[0];
    s.push("message:new", message("m1"));
    expect(useMessagingStore.getState().conversations[0].unreadCount).toBe(1);
    setOpenConversation("c1");
    s.push("message:new", message("m2"));
    setOpenConversation(null);
    expect(useMessagingStore.getState().conversations[0].unreadCount).toBe(1);
    expect(useMessagingStore.getState().messages.c1).toHaveLength(2);
  });

  it("ignores malformed payloads and my own typing", async () => {
    await connectRealtime(TENANT_ID);
    const s = mockSockets[0];
    s.push("message:new", { nonsense: true });
    s.push("typing:start", { conversationId: "c1", userId: "me" });
    s.push("typing:start", { conversationId: "c1", userId: "u2" });
    expect(useMessagingStore.getState().messages.c1).toBeUndefined();
    expect(Object.keys(useMessagingStore.getState().typing.c1)).toEqual(["u2"]);
  });

  it("applies deletions, moderation and my reads from another device", async () => {
    useMessagingStore.getState().setConversations([{ conversationId: "c1", type: "direct", title: null, lastMessageAt: null, lastMessagePreview: null, unreadCount: 4, participants: [] }]);
    await connectRealtime(TENANT_ID);
    const s = mockSockets[0];
    s.push("message:new", message("m1"));
    s.push("message:moderated", { conversationId: "c1", messageId: "m1", status: "HIDDEN" });
    expect(useMessagingStore.getState().messages.c1[0].moderationStatus).toBe("HIDDEN");
    s.push("read", { conversationId: "c1", userId: "me", upToMessageId: "m1" });
    expect(useMessagingStore.getState().conversations[0].unreadCount).toBe(0);
    s.push("message:deleted", { conversationId: "c1", messageId: "m1" });
    expect(useMessagingStore.getState().messages.c1).toEqual([]);
  });
});

describe("backfill", () => {
  it("drops an answer that arrives after a tenant switch", async () => {
    jest.spyOn(MessagingClientService, "listConversations").mockImplementation(async () => {
      useTenantStore.setState({ activeTenantId: OTHER_TENANT_ID });
      return { conversations: [{ conversationId: "x", type: "direct", title: null, lastMessageAt: null, lastMessagePreview: null, unreadCount: 0, participants: [] }], nextCursor: null };
    });
    await backfill();
    expect(useMessagingStore.getState().conversations).toEqual([]);
  });
});
