import * as Haptics from "expo-haptics";
import { handleApiError } from "@/libs/errorUtils";
import { normalizeApiError } from "@/libs/apiError";
import logger from "@/libs/logger";
import { MessagingClientService } from "@/services/platform/messaging.service.client";
import type { Message } from "@/services/platform/messaging.dto";
import { useAuthStore } from "@/stores/authStore";
import { useMessagingStore } from "@/stores/messagingStore";
import { scopedEntries, useOutboxStore, type OutboxScope } from "@/stores/outboxStore";
import { getActiveTenantId } from "@/stores/tenantStore";
import { isTransientSendFailure, newClientNonce } from "@/utils/messaging";

// ============================================================================
// Offline outbox — flush logic for `stores/outboxStore.ts`.
//   - The server dedupes POST /conversations/{id}/messages per (sender,
//     conversation, clientNonce): a resend answers 200 {message, replayed:true}
//     with the ORIGINAL message, which is success here. So a request whose
//     response was lost (or an app kill mid-flight) can always be retried.
//   - Entries are sent one at a time, oldest first, each with its original
//     nonce. A transient failure (offline, 5xx, 429, 401) stops the run so
//     order is kept and the next trigger (socket connect, app resume, tapping
//     retry, a new send) continues; a permanent refusal marks that entry failed
//     and the run moves on.
//   - Only the ACTIVE (tenant, user) scope is touched. Every answer is
//     re-checked against it, like libs/realtime.ts, so nothing is delivered
//     into or shown under another organization or account.
// ============================================================================

let running: Promise<void> | null = null;
let rerun = false;

/** The signed-in (tenant, user) the outbox may act for, or null. */
export function currentScope(): OutboxScope | null {
  const auth = useAuthStore.getState();
  const userId = auth.user?.userId;
  if (!auth.isAuthenticated || !userId) return null;
  return { tenantId: getActiveTenantId(), userId };
}

const sameScope = (a: OutboxScope) => {
  const now = currentScope();
  return now !== null && now.tenantId === a.tenantId && now.userId === a.userId;
};

/** Writes a message into the persisted outbox and starts a flush. Returns its nonce, or null when signed out. */
export function queueMessage(conversationId: string, body: string): string | null {
  const scope = currentScope();
  if (!scope) return null;
  const nonce = newClientNonce();
  useOutboxStore.getState().enqueue({ nonce, ...scope, conversationId, body, createdAt: new Date().toISOString() });
  void flushOutbox();
  return nonce;
}

/** User tapped retry on a queued or failed message: same nonce, back in line. */
export function retryQueued(nonce: string): void {
  const entry = useOutboxStore.getState().entries.find((e) => e.nonce === nonce);
  const scope = currentScope();
  if (!entry || !scope || entry.tenantId !== scope.tenantId || entry.userId !== scope.userId) return;
  if (entry.status === "failed") useOutboxStore.getState().setStatus(nonce, "queued");
  void flushOutbox();
}

/**
 * Sends everything queued for the active scope. Single flight: a call during a run asks for one more pass, and the
 * returned promise resolves only after that pass too.
 */
export function flushOutbox(): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    do {
      rerun = false;
      await run();
    } while (rerun);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function run(): Promise<void> {
  const scope = currentScope();
  if (!scope) return;
  const queue = scopedEntries(useOutboxStore.getState().entries, scope).filter((e) => e.status === "queued");

  for (const snapshot of queue) {
    if (!sameScope(scope)) return;
    const store = useOutboxStore.getState();
    // Re-read: the socket echo (or a discard) may have settled it while an earlier entry was in flight.
    const entry = store.entries.find((e) => e.nonce === snapshot.nonce);
    if (!entry || entry.status !== "queued") continue;
    store.setStatus(entry.nonce, "sending");

    try {
      const { message, replayed } = await MessagingClientService.sendMessage(entry.conversationId, { body: entry.body, clientNonce: entry.nonce }, { tenantId: entry.tenantId });
      if (replayed) logger.info("[outbox] send was already stored on the server (replayed)");
      useOutboxStore.getState().remove(entry.nonce); // delivered either way
      if (sameScope(scope)) useMessagingStore.getState().confirmSent(message);
    } catch (err: unknown) {
      const { statusCode } = normalizeApiError(err);
      if (isTransientSendFailure(statusCode)) {
        useOutboxStore.getState().setStatus(entry.nonce, "queued"); // keep the order: stop here, try again on the next trigger
        logger.warn("[outbox] send postponed", statusCode ?? "no response");
        return;
      }
      useOutboxStore.getState().setStatus(entry.nonce, "failed");
      if (sameScope(scope)) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        handleApiError(err, "outbox.flush");
      }
    }
  }
}

/**
 * A message that is already on the server (socket `message:new` carrying our clientNonce, or a REST page) is
 * confirmed: its outbox entry is dropped so the optimistic bubble does not sit next to the real one.
 */
export function reconcileOutbox(messages: Message[]): void {
  const scope = currentScope();
  if (!scope) return;
  const store = useOutboxStore.getState();
  const mine = new Map(scopedEntries(store.entries, scope).map((e) => [e.nonce, e.conversationId]));
  if (mine.size === 0) return;
  for (const m of messages) {
    if (m.clientNonce && m.senderUserId === scope.userId && mine.get(m.clientNonce) === m.conversationId) store.remove(m.clientNonce);
  }
}

/** Drops everything the outbox holds (sign-out). In-flight answers find nothing to settle. */
export function clearOutbox(): void {
  useOutboxStore.getState().clearAll();
}

/** Signed in as someone new on this device: the previous account's unsent messages must not linger or be sent. */
export function pruneOutboxFor(userId: string): void {
  useOutboxStore.getState().pruneOthers(userId);
}
