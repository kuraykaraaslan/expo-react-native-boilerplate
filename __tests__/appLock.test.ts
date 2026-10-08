import { APP_LOCK_GRACE_MS, shouldLock, useAppLockStore } from "@/libs/appLock";

const T0 = 1_000_000;

beforeEach(() => useAppLockStore.getState().reset());

describe("shouldLock", () => {
  it("locks only when enabled and away for at least the grace period", () => {
    expect(shouldLock(true, T0, T0 + APP_LOCK_GRACE_MS)).toBe(true);
    expect(shouldLock(true, T0, T0 + APP_LOCK_GRACE_MS - 1)).toBe(false);
    expect(shouldLock(false, T0, T0 + 10 * APP_LOCK_GRACE_MS)).toBe(false);
    expect(shouldLock(true, null, T0 + 10 * APP_LOCK_GRACE_MS)).toBe(false); // never backgrounded
  });
});

describe("app lock store", () => {
  it("locks on return after the grace period, and a brief departure (the system prompt itself) does not", () => {
    const s = useAppLockStore.getState();
    s.setEnabled(true);
    s.markBackgrounded(T0);
    useAppLockStore.getState().markForegrounded(T0 + 2_000);
    expect(useAppLockStore.getState().locked).toBe(false);

    useAppLockStore.getState().markBackgrounded(T0);
    useAppLockStore.getState().markForegrounded(T0 + APP_LOCK_GRACE_MS + 1);
    expect(useAppLockStore.getState().locked).toBe(true);
  });

  it("keeps the first timestamp when inactive is followed by background", () => {
    const s = useAppLockStore.getState();
    s.setEnabled(true);
    s.markBackgrounded(T0);
    useAppLockStore.getState().markBackgrounded(T0 + 20_000);
    useAppLockStore.getState().markForegrounded(T0 + APP_LOCK_GRACE_MS);
    expect(useAppLockStore.getState().locked).toBe(true);
  });

  it("never locks while disabled, and unlock clears the lock", () => {
    useAppLockStore.getState().lock();
    expect(useAppLockStore.getState().locked).toBe(false);
    useAppLockStore.getState().setEnabled(true);
    useAppLockStore.getState().lock();
    expect(useAppLockStore.getState().locked).toBe(true);
    useAppLockStore.getState().unlock();
    expect(useAppLockStore.getState().locked).toBe(false);
  });

  it("reset (sign-out) turns the lock off so the next account does not inherit it", () => {
    useAppLockStore.getState().setEnabled(true);
    useAppLockStore.getState().lock();
    useAppLockStore.getState().reset();
    expect(useAppLockStore.getState()).toMatchObject({ enabled: false, locked: false, backgroundedAt: null });
  });
});
