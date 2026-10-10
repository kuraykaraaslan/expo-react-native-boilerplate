import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import { zustandMMKVStorage } from "@/libs/zustandStorage";

// ============================================================================
// Outbox store — messages the user sent that the server has not confirmed yet.
// PERSISTED (MMKV): an unsent message survives an app kill and is flushed on
// the next (re)connect / resume by `libs/outbox.ts`, each time with its
// ORIGINAL clientNonce (the server dedupes sends per sender + conversation +
// nonce, so a resend of something that already landed is harmless).
//
// Tenant isolation: every entry carries the tenant AND user it was written
// for. Readers and the flusher only ever touch the active (tenant, user)
// scope; sign-out wipes the whole list. Message bodies are user content, never
// tokens, and are never logged.
// ============================================================================

export const OutboxEntrySchema = z.object({
  nonce: z.string().min(1).max(64),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  conversationId: z.string().min(1),
  body: z.string().min(1).max(8000),
  createdAt: z.string(),
  /** queued: waiting for a flush · sending: a request is in flight · failed: the server refused it for good. */
  status: z.enum(["queued", "sending", "failed"]),
});
export type OutboxEntry = z.infer<typeof OutboxEntrySchema>;
export type OutboxStatus = OutboxEntry["status"];
export type OutboxScope = { tenantId: string; userId: string };

interface OutboxState {
  /** Oldest first: the order messages were written, which is the order they are sent. */
  entries: OutboxEntry[];
  enqueue: (entry: Omit<OutboxEntry, "status">) => void;
  setStatus: (nonce: string, status: OutboxStatus) => void;
  /** Drops an entry once its message is confirmed (REST answer, replay, socket echo) or discarded. */
  remove: (nonce: string) => void;
  /** Drops every entry written for someone other than `userId` (a different account signed in on this device). */
  pruneOthers: (userId: string) => void;
  /** Drops every entry of one organization (its session ended while others remain). */
  clearTenant: (tenantId: string) => void;
  clearAll: () => void;
}

export const useOutboxStore = create<OutboxState>()(
  persist(
    (set): OutboxState => ({
      entries: [],
      enqueue: (entry) => set((s) => ({ entries: [...s.entries.filter((e) => e.nonce !== entry.nonce), { ...entry, status: "queued" as const }] })),
      setStatus: (nonce, status) => set((s) => ({ entries: s.entries.map((e) => (e.nonce === nonce ? { ...e, status } : e)) })),
      remove: (nonce) => set((s) => ({ entries: s.entries.filter((e) => e.nonce !== nonce) })),
      pruneOthers: (userId) => set((s) => (s.entries.every((e) => e.userId === userId) ? s : { entries: s.entries.filter((e) => e.userId === userId) })),
      clearTenant: (tenantId) => set((s) => ({ entries: s.entries.filter((e) => e.tenantId !== tenantId) })),
      clearAll: () => set({ entries: [] }),
    }),
    {
      name: "outbox-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({ entries: state.entries }),
      // Anything corrupt is dropped; a request that was in flight when the app died is simply queued again
      // (resending it with the same nonce is safe).
      merge: (persisted, current) => {
        const raw = (persisted as { entries?: unknown } | undefined)?.entries;
        const entries = (Array.isArray(raw) ? raw : []).flatMap((item) => {
          const parsed = OutboxEntrySchema.safeParse(item);
          return parsed.success ? [{ ...parsed.data, status: parsed.data.status === "sending" ? ("queued" as const) : parsed.data.status }] : [];
        });
        return { ...current, entries };
      },
    },
  ),
);

/** Entries of one (tenant, user) scope, optionally one conversation, in send order. */
export function scopedEntries(entries: OutboxEntry[], scope: OutboxScope, conversationId?: string): OutboxEntry[] {
  return entries.filter((e) => e.tenantId === scope.tenantId && e.userId === scope.userId && (conversationId === undefined || e.conversationId === conversationId));
}
