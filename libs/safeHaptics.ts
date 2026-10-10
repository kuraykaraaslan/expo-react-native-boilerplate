/**
 * Haptics are a courtesy: a device without them (web, simulator) must never change the outcome of
 * an action. Awaits the feedback and swallows any failure.
 */
export async function safeHaptic(feedback: () => Promise<void>): Promise<void> {
  try {
    await feedback();
  } catch {
    // ignore: no haptic engine
  }
}
