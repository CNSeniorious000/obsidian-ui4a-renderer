/**
 * $macaron/chat adapter for Obsidian.
 *
 * In the reference web harness, `sendUserMessage(prompt)` injects a new user
 * turn into the running assistant chat, driving the next model response.
 *
 * Obsidian has no listening assistant loop. We map the same primitive onto the
 * note-graph: the widget's intent is appended to the active note as a callout,
 * creating a durable, linkable record that doubles as context for the next
 * genui-builder run.
 *
 * Routing is per-widget: the compiler injects a `sendUserMessage` closure bound
 * to the mounting widget's bridge (see compiler.ts), so two widgets on the same
 * page never contend over a shared global. The globalThis.sendUserMessage
 * safety net (for widgets that forget the import) dispatches to the most
 * recently mounted widget via a stack, so unmounting one widget never severs
 * another's fallback path either.
 */

export type ChatDispatch = (prompt: string) => void;

/** Stack of active widget dispatchers; the top (last pushed) is the fallback target. */
const bridgeStack: ChatDispatch[] = [];

/**
 * Register a widget's dispatcher as a fallback target for the global safety
 * net. Returns an unregister function — call it on unmount. Stack discipline
 * means unmounting widget B never removes widget A's entry.
 */
export function pushChatBridge(dispatch: ChatDispatch): () => void {
  bridgeStack.push(dispatch);
  return () => {
    const i = bridgeStack.indexOf(dispatch);
    if (i !== -1) bridgeStack.splice(i, 1);
  };
}

function fallbackToClipboard(text: string): void {
  try {
    navigator.clipboard?.writeText(text);
    console.info("[ui4a] sendUserMessage (no active bridge — copied to clipboard):", text);
  } catch {
    console.warn("[ui4a] sendUserMessage dropped (no bridge, no clipboard):", text);
  }
}

/**
 * Build the `sendUserMessage` for one widget instance. When `dispatch` is
 * given, intents route straight to that widget's host; without one (e.g.
 * display-only / standalone preview) we fall back to the most recently
 * registered bridge, then to the clipboard so a click is never silently lost.
 */
export function createSendUserMessage(dispatch?: ChatDispatch) {
  return function sendUserMessage(prompt: unknown): void {
    if (typeof prompt !== "string") throw new TypeError("sendUserMessage expects a string prompt");
    const target = dispatch ?? bridgeStack[bridgeStack.length - 1];
    if (target) target(prompt);
    else fallbackToClipboard(prompt);
  };
}

// Models empirically forget the import ~30% of the time; expose on globalThis as
// a safety net exactly as the reference shim does. This one has no fixed widget
// binding — it always routes to the most recently mounted widget.
const g = globalThis as unknown as Record<string, unknown>;
if (typeof g.sendUserMessage === "undefined") g.sendUserMessage = createSendUserMessage();
