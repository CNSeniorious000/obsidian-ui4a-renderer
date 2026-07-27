/**
 * $macaron/chat adapter for Obsidian.
 *
 * In the reference web harness, `sendUserMessage(prompt)` injects a new user
 * turn into the running assistant chat, driving the next model response.
 *
 * Obsidian has no listening assistant loop. We map the same primitive onto the
 * note-graph: the widget's intent is appended to the active note as a callout,
 * creating a durable, linkable record that doubles as context for the next
 * genui-builder run. The host registers the dispatcher on globalThis['$app/chat']
 * (see codeblock-processor.ts); if none is active, we fall back to copying the
 * intent to the clipboard so a display-only widget never silently drops a click.
 */
const dispatch = (text: string): void => {
  const bridge = (globalThis as unknown as Record<string, ((p: string) => void) | undefined>)["$app/chat"];
  if (bridge) {
    bridge(text);
    return;
  }
  // Fallback: no active widget context (e.g. display-only / standalone preview).
  try {
    navigator.clipboard?.writeText(text);
    console.info("[ui4a] sendUserMessage (no active bridge — copied to clipboard):", text);
  } catch {
    console.warn("[ui4a] sendUserMessage dropped (no bridge, no clipboard):", text);
  }
};

export function sendUserMessage(prompt: unknown): void {
  if (typeof prompt !== "string") throw new TypeError("sendUserMessage expects a string prompt");
  dispatch(prompt);
}

// Models empirically forget the import ~30% of the time; expose on globalThis as
// a safety net exactly as the reference shim does.
const g = globalThis as unknown as Record<string, unknown>;
if (typeof g.sendUserMessage === "undefined") g.sendUserMessage = sendUserMessage;
