import { clearOutbox, flushOutbox, queueMessage, reconcileOutbox, retryQueued } from "@/libs/outbox";
import { connectRealtime, disconnectRealtime } from "@/libs/realtime";
import { logout } from "@/libs/logout";
import { useAuthStore } from "@/stores/authStore";
import { useMessagingStore } from "@/stores/messagingStore";
import { useOutboxStore } from "@/stores/outboxStore";
import { useTenantStore } from "@/stores/tenantStore";
import { MessagingClientService } from "@/services/platform/messaging.service.client";
import { mmkv } from "@/libs/mmkv";
import { server } from "./_server";
import { http, HttpResponse } from "msw";
import { OTHER_TENANT_ID, TENANT_ID } from "./fixtures";
import { API_ORIGIN, fail, mockRoute, signIn } from "./_helpers";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Error: "error", Warning: "warning", Success: "success" },
}));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));
jest.mock("socket.io-client", () => {
  const handlers = new Map<string, unknown>();
  const socket = { on: (e: string, h: unknown) => (handlers.set(e, h), socket), emit: jest.fn(), removeAllListeners: () => (handlers.clear(), socket), disconnect: jest.fn(), connected: true, active: true };
  return { io: () => socket, __handlers: handlers };
});

const ME = "me-user";
const stored = (nonce: string, conversationId = "c1", over: Record<string, unknown> = {}) => ({
  messageId: `srv-${nonce}`,
  conversationId,
  senderUserId: ME,
  body: `body ${nonce}`,
  contentType: "text",
  moderationStatus: "CLEAN",
  createdAt: "2026-10-01T10:00:00Z",
  clientNonce: nonce,
  ...over,
});

beforeEach(async () => {
  await signIn(TENANT_ID);
  useAuthStore.setState({ user: { userId: ME, email: "me@example.com" } as never });
  useOutboxStore.setState({ entries: [] });
  useMessagingStore.getState().reset();
});
afterEach(() => {
  disconnectRealtime();
  jest.restoreAllMocks();
});

const entries = () => useOutboxStore.getState().entries;

describe("offline outbox", () => {
  it("sends queued messages in order, each with its original nonce, and clears them on success", async () => {
    const seen = mockRoute("post", "/conversations/c1/messages", (n: number) => ({ body: { message: stored(`srv${n}`), replayed: false }, init: { status: 201 } }));
    useOutboxStore.getState().enqueue({ nonce: "n-a", tenantId: TENANT_ID, userId: ME, conversationId: "c1", body: "first", createdAt: "2026-10-01T10:00:00Z" });
    useOutboxStore.getState().enqueue({ nonce: "n-b", tenantId: TENANT_ID, userId: ME, conversationId: "c1", body: "second", createdAt: "2026-10-01T10:00:01Z" });
    await flushOutbox();
    expect(seen.map((r) => r.body)).toEqual([
      { body: "first", clientNonce: "n-a" },
      { body: "second", clientNonce: "n-b" },
    ]);
    expect(entries()).toEqual([]);
    expect(useMessagingStore.getState().messages.c1).toHaveLength(2);
  });

  it("treats 200 replayed:true as success (the original message is kept, nothing is duplicated)", async () => {
    mockRoute("post", "/conversations/c1/messages", () => ({ body: { message: stored("n-a"), replayed: true }, init: { status: 200 } }));
    useOutboxStore.getState().enqueue({ nonce: "n-a", tenantId: TENANT_ID, userId: ME, conversationId: "c1", body: "hi", createdAt: "2026-10-01T10:00:00Z" });
    useMessagingStore.getState().receiveMessage(stored("n-a") as never, { fromMe: true, open: true }); // the socket echo already delivered it
    await flushOutbox();
    expect(entries()).toEqual([]);
    expect(useMessagingStore.getState().messages.c1.map((m) => m.messageId)).toEqual(["srv-n-a"]);
  });

  it("keeps order and the same nonce across a transient failure, then delivers on the next flush", async () => {
    const seen = mockRoute("post", "/conversations/c1/messages", (n: number) =>
      n <= 2 ? fail(503, { message: "down" }) : { body: { message: stored(`n-${n}`), replayed: false }, init: { status: 201 } },
    );
    queueMessage("c1", "one");
    await flushOutbox();
    expect(entries().map((e) => e.status)).toEqual(["queued"]);
    const nonce = entries()[0].nonce;
    queueMessage("c1", "two"); // written behind the stuck one: it must not overtake it
    await flushOutbox(); // reconnect / resume
    expect(entries()).toEqual([]);
    const bodies = seen.map((r) => r.body as { body: string; clientNonce: string });
    expect(bodies.map((b) => b.body)).toEqual(["one", "one", "one", "two"]);
    expect(bodies.slice(0, 3).every((b) => b.clientNonce === nonce)).toBe(true); // every retry reuses the ORIGINAL nonce
    expect(bodies[3].clientNonce).not.toBe(nonce);
  });

  it("treats a network failure (no response) as transient", async () => {
    server.use(http.post(`${API_ORIGIN}/api/tenant/:tenantId/conversations/c1/messages`, () => HttpResponse.error()));
    queueMessage("c1", "offline");
    await flushOutbox();
    expect(entries()).toHaveLength(1);
    expect(entries()[0].status).toBe("queued");
  });

  it("marks a permanent refusal failed, moves on, and a manual retry re-queues it with the same nonce", async () => {
    const seen = mockRoute("post", "/conversations/:id/messages".replace(":id", "c1"), (n: number) =>
      n === 1 ? fail(403, { message: "NOT_A_PARTICIPANT" }) : { body: { message: stored(`n-${n}`), replayed: false }, init: { status: 201 } },
    );
    mockRoute("post", "/conversations/c2/messages", { message: stored("n-x", "c2"), replayed: false });
    queueMessage("c1", "refused");
    await flushOutbox();
    queueMessage("c2", "fine");
    await flushOutbox();
    expect(entries().map((e) => e.status)).toEqual(["failed"]);
    const nonce = entries()[0].nonce;
    retryQueued(nonce);
    await flushOutbox();
    expect(entries()).toEqual([]);
    expect((seen[1].body as { clientNonce: string }).clientNonce).toBe(nonce);
  });

  it("a message:new carrying our clientNonce settles the optimistic copy; foreign nonces do not", () => {
    useOutboxStore.getState().enqueue({ nonce: "n-a", tenantId: TENANT_ID, userId: ME, conversationId: "c1", body: "hi", createdAt: "2026-10-01T10:00:00Z" });
    reconcileOutbox([stored("n-a", "c1", { senderUserId: "someone-else" }) as never]);
    expect(entries()).toHaveLength(1);
    reconcileOutbox([stored("n-a", "c2") as never]); // other conversation
    expect(entries()).toHaveLength(1);
    reconcileOutbox([stored("n-a") as never]);
    expect(entries()).toEqual([]);
  });

  it("the socket handler reconciles by nonce", async () => {
    jest.spyOn(MessagingClientService, "createWsTicket").mockResolvedValue({ ticket: "t", expiresIn: 30, wsUrl: "wss://ws.example.com", path: "/messaging" });
    jest.spyOn(MessagingClientService, "listConversations").mockResolvedValue({ conversations: [], nextCursor: null });
    useOutboxStore.getState().enqueue({ nonce: "n-a", tenantId: TENANT_ID, userId: ME, conversationId: "c1", body: "hi", createdAt: "2026-10-01T10:00:00Z" });
    await connectRealtime(TENANT_ID);
    const { __handlers } = jest.requireMock("socket.io-client") as { __handlers: Map<string, unknown> };
    (__handlers.get("message:new") as (p: unknown) => void)(stored("n-a"));
    expect(entries()).toEqual([]);
    expect(useMessagingStore.getState().messages.c1).toHaveLength(1);
  });

  it("only touches the active tenant's and user's entries", async () => {
    const seen = mockRoute("post", "/conversations/c1/messages", { message: stored("n-mine"), replayed: false });
    const base = { conversationId: "c1", createdAt: "2026-10-01T10:00:00Z" };
    useOutboxStore.getState().enqueue({ nonce: "n-mine", tenantId: TENANT_ID, userId: ME, body: "mine", ...base });
    useOutboxStore.getState().enqueue({ nonce: "n-other-tenant", tenantId: OTHER_TENANT_ID, userId: ME, body: "other org", ...base });
    useOutboxStore.getState().enqueue({ nonce: "n-other-user", tenantId: TENANT_ID, userId: "someone", body: "other user", ...base });
    await flushOutbox();
    expect(seen).toHaveLength(1);
    expect(entries().map((e) => e.nonce)).toEqual(["n-other-tenant", "n-other-user"]);
    useOutboxStore.getState().pruneOthers(ME);
    expect(entries().map((e) => e.nonce)).toEqual(["n-other-tenant"]);
  });

  it("an answer that arrives after an organization switch is not shown in the new organization", async () => {
    mockRoute("post", "/conversations/c1/messages", () => {
      useTenantStore.setState({ activeTenantId: OTHER_TENANT_ID });
      return { body: { message: stored("n-a"), replayed: false }, init: { status: 201 } };
    });
    useOutboxStore.getState().enqueue({ nonce: "n-a", tenantId: TENANT_ID, userId: ME, conversationId: "c1", body: "hi", createdAt: "2026-10-01T10:00:00Z" });
    await flushOutbox();
    expect(entries()).toEqual([]); // it was delivered
    expect(useMessagingStore.getState().messages.c1).toBeUndefined();
  });

  it("does nothing while signed out", async () => {
    useAuthStore.setState({ isAuthenticated: false, user: null });
    expect(queueMessage("c1", "hi")).toBeNull();
    await flushOutbox();
    expect(entries()).toEqual([]);
  });

  it("is wiped by sign-out", async () => {
    mockRoute("post", "/auth/logout", {});
    useOutboxStore.getState().enqueue({ nonce: "n-a", tenantId: TENANT_ID, userId: ME, conversationId: "c1", body: "hi", createdAt: "2026-10-01T10:00:00Z" });
    await logout();
    expect(entries()).toEqual([]);
    clearOutbox();
  });
});

describe("persistence", () => {
  it("writes entries to MMKV under outbox-storage and revives them after an app kill (in-flight becomes queued)", async () => {
    useOutboxStore.getState().enqueue({ nonce: "n-a", tenantId: TENANT_ID, userId: ME, conversationId: "c1", body: "hi", createdAt: "2026-10-01T10:00:00Z" });
    useOutboxStore.getState().setStatus("n-a", "sending");
    const raw = mmkv.getString("outbox-storage");
    expect(raw).toBeDefined();
    const saved = JSON.parse(raw as string);
    expect(saved.state.entries).toMatchObject([{ nonce: "n-a", status: "sending" }]);
    saved.state.entries.push({ garbage: true });
    useOutboxStore.setState({ entries: [] }); // the app is "killed": memory is gone, MMKV keeps what was written
    mmkv.set("outbox-storage", JSON.stringify(saved));
    await useOutboxStore.persist.rehydrate();
    expect(entries()).toMatchObject([{ nonce: "n-a", body: "hi", status: "queued" }]);
  });
});
