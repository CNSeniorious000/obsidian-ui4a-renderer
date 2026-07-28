/**
 * Verification harness for MAC-10810: mounts TWO ui4a widgets through the real
 * production path (mountWidget → WidgetHost → compileWidget), each with its own
 * onUserIntent handler and its own mock Obsidian app, and renders a visible
 * event log so cross-widget misrouting shows up on screen.
 *
 * Build with demo/build.mjs; open demo/index.html in a browser.
 */
import { mountWidget } from "../src/runtime/WidgetHost";
import type { App } from "obsidian";

// ---- visible event log -----------------------------------------------------
const logEl = document.getElementById("log")!;
let seq = 0;
function log(msg: string) {
  const li = document.createElement("li");
  li.textContent = `#${++seq} ${msg}`;
  logEl.appendChild(li);
}
log("harness booted");
window.addEventListener("error", (e) => log(`PAGE ERROR: ${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener("unhandledrejection", (e) => log(`PAGE REJECTION: ${String(e.reason).slice(0, 300)}`));

// Surface console fallbacks (e.g. "no active bridge — copied to clipboard") in
// the visible log so a severed bridge is observable, not silent.
const origInfo = console.info.bind(console);
const origWarn = console.warn.bind(console);
console.info = (...args: unknown[]) => { log(`console.info: ${args.map(String).join(" ")}`); origInfo(...args); };
console.warn = (...args: unknown[]) => { log(`console.warn: ${args.map(String).join(" ")}`); origWarn(...args); };

// Log wikilink clicks at the document level, so "click happened but no
// openLinkText followed" is distinguishable from "no click".
document.addEventListener("click", (e) => {
  const a = (e.target as HTMLElement).closest?.(".ui4a-wikilink");
  if (a) log(`clicked wikilink data-note=${a.getAttribute("data-note")}`);
});

// ---- mock Obsidian apps (one per widget, to expose misrouting) --------------
function mockApp(name: string): App {
  return {
    workspace: {
      openLinkText: (target: string) => log(`${name}.workspace.openLinkText("${target}")`),
    },
  } as unknown as App;
}

// ---- widget sources ---------------------------------------------------------
function widgetSource(label: string, note: string, btnId: string): string {
  return `
import { sendUserMessage } from "$macaron/chat";
import { LinkText } from "$macaron/ui";
export default function App() {
  return (
    <div style={{ border: "1px solid #888", borderRadius: 8, padding: 12, margin: 8 }}>
      <strong>Widget ${label}</strong>
      <button id="${btnId}" style={{ display: "block", margin: "8px 0" }}
        onClick={() => sendUserMessage("ping from widget ${label}")}>
        ${label}: sendUserMessage
      </button>
      <LinkText>open [[${note}]]</LinkText>
    </div>
  );
}`;
}

// ---- mount controls ---------------------------------------------------------
const roots = new Map<string, { unmount: () => void }>();

function mount(label: "A" | "B") {
  if (roots.has(label)) return;
  const host = document.getElementById(`host-${label.toLowerCase()}`)!;
  host.classList.add("genui-root");
  const root = mountWidget(
    host,
    widgetSource(label, `Note${label}`, `btn-send-${label.toLowerCase()}`),
    (prompt) => log(`widget ${label} onUserIntent("${prompt}")`),
    mockApp(`app${label}`)
  );
  roots.set(label, root);
  log(`mounted widget ${label}`);
}

function unmount(label: "A" | "B") {
  const root = roots.get(label);
  if (!root) return;
  root.unmount();
  roots.delete(label);
  log(`unmounted widget ${label}`);
}

document.getElementById("mount-a")!.addEventListener("click", () => mount("A"));
document.getElementById("mount-b")!.addEventListener("click", () => mount("B"));
document.getElementById("unmount-b")!.addEventListener("click", () => unmount("B"));

mount("A");
mount("B");
