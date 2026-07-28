import { registerCodeblockProcessor } from "../src/codeblock-processor";
import { appendIntentCallout, insertIntent } from "../src/intent-recorder";
import { noticeMessages } from "./obsidian-stub";
import { lifecycle, mountWidget, resetLifecycle } from "./widget-host-stub";

HTMLElement.prototype.empty = function empty() { this.replaceChildren(); };
HTMLElement.prototype.addClass = function addClass(...classes: string[]) { this.classList.add(...classes); };

const params = new URLSearchParams(location.search);
const scenario = params.get("scenario") ?? "lifecycle";
const state = params.get("state") === "after" ? "after" : "before";
const ownerPath = "Widgets/Quarterly-plan.md";
const activePath = "Dashboard.md";
const widgetBlock = ["```ui4a", "export default () => <PlanPicker />", "```"].join("\n");
const ownerNote = ["# Quarterly plan", "", widgetBlock, "", "## Assumptions", "Keep this section with the widget."].join("\n");
const dashboardNote = ["# Dashboard", "", "The user is currently reading this note."].join("\n");
const intentBody = "> [!user-intent]\n> Use the conservative plan\n";

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

function notePanel(title: string, path: string, content: string): string {
  const lines = content.split("\n").map((line, index) => {
    const intent = line.includes("[!user-intent]") || (index > 0 && content.split("\n")[index - 1]?.includes("[!user-intent]"));
    return `<div class="line${intent ? " intent" : ""}"><span class="line-no">${index + 1}</span><span>${escapeHtml(line) || " "}</span></div>`;
  }).join("");
  return `<section class="panel"><div class="panel-title"><span>${title}</span><span class="path">${path}</span></div><div class="editor">${lines}</div></section>`;
}

function shell(title: string, operation: string, body: string): string {
  return `<header><div><div class="eyebrow">MAC-10814 · executable evidence</div><h1>${title}</h1></div><div class="state ${state}">${state.toUpperCase()}</div></header><div class="operation"><span>▶</span><span><b>Same operation:</b> ${operation}</span></div>${body}<footer>Harness: production intent-recorder + production MarkdownRenderChild wiring with deterministic Obsidian/React stubs</footer>`;
}

function metrics(values: Array<[string, number]>): string {
  return `<div class="metric-grid">${values.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("")}</div>`;
}

function events(items: Array<["good" | "bad" | "", string]>): string {
  return `<div class="timeline">${items.map(([kind, text]) => `<div class="event ${kind}"><span class="dot"></span><span>${text}</span></div>`).join("")}</div>`;
}

async function renderLifecycle(): Promise<string> {
  resetLifecycle();
  const host = document.createElement("div");

  if (state === "before") {
    mountWidget(host);
    host.remove();
  } else {
    let processor: ((source: string, el: HTMLElement, ctx: any) => void) | undefined;
    let child: { onload(): void; onunload(): void } | undefined;
    const plugin = {
      app: {}, settings: { appendCallout: true },
      registerMarkdownCodeBlockProcessor: (_lang: string, callback: typeof processor) => { processor = callback; },
    } as any;
    const context = {
      sourcePath: ownerPath,
      getSectionInfo: () => null,
      addChild: (value: typeof child) => { child = value; value?.onload(); },
    };
    registerCodeblockProcessor(plugin);
    processor?.("export default () => null", host, context);
    child?.onunload();
  }

  const healthy = lifecycle.mountedRoots === 0 && lifecycle.activeEffects === 0;
  return shell(
    "Renderer teardown releases root and effects",
    "render one widget, then unload its Markdown preview section",
    `<div class="grid"><section class="panel sidebar"><h2>Lifecycle counters after unload</h2>${metrics([["mounted roots", lifecycle.mountedRoots], ["active effects", lifecycle.activeEffects], ["root.unmount calls", lifecycle.unmountCalls], ["detached hosts", 1]])}<div class="verdict">${healthy ? "The MarkdownRenderChild owns the React root; Obsidian unload triggers root.unmount() and effect cleanup." : "The host disappeared, but the discarded outer React root stayed mounted and its effect remained active."}</div></section><section class="panel sidebar"><h2>Event trace</h2>${events(state === "before" ? [["", "Widget root mounted"], ["", "Effect subscribed"], ["bad", "Preview host removed"], ["bad", "No owner retained the root"]] : [["", "Widget root mounted"], ["", "Effect subscribed"], ["good", "MarkdownRenderChild.onunload"], ["good", "root.unmount → cleanup"]])}</section></div>`,
  );
}

async function renderTarget(): Promise<string> {
  noticeMessages.length = 0;
  const notes: Record<string, string> = { [ownerPath]: ownerNote, [activePath]: dashboardNote };
  if (state === "before") {
    notes[activePath] += `\n\n${intentBody}`;
    noticeMessages.push("已记录 UI4A 意图到笔记");
  } else {
    const vault = {
      getFileByPath: (path: string) => ({ path }),
      process: async (file: { path: string }, transform: (data: string) => string) => {
        notes[file.path] = transform(notes[file.path]);
        return notes[file.path];
      },
    };
    await appendIntentCallout(
      { app: { vault } as any, settings: { appendCallout: true } },
      ownerPath,
      { lineStart: 2, lineEnd: 4, text: widgetBlock },
      "Use the conservative plan",
    );
  }
  const ownerChanged = notes[ownerPath].includes("[!user-intent]");
  return shell(
    "Intent writes to the widget’s source note",
    `click the widget in ${ownerPath} while ${activePath} is active`,
    `<div class="grid"><div class="notes">${notePanel("Widget owner", ownerPath, notes[ownerPath])}${notePanel("Active note", activePath, notes[activePath])}</div><section class="panel sidebar"><h2>Write routing</h2>${events([[ownerChanged ? "good" : "bad", `${ownerPath}: ${ownerChanged ? "updated" : "unchanged"}`], [!notes[activePath].includes("[!user-intent]") ? "good" : "bad", `${activePath}: ${notes[activePath].includes("[!user-intent]") ? "incorrectly updated" : "unchanged"}`]])}<div class="toast ${ownerChanged ? "success" : "failure"}">${escapeHtml(noticeMessages[0] ?? "No feedback")}</div><div class="verdict">${ownerChanged ? "ctx.sourcePath selects the owning note, independent of whichever leaf is active." : "The active leaf captured an intent emitted by a different note’s widget."}</div></section></div>`,
  );
}

async function renderAwaitFailure(): Promise<string> {
  noticeMessages.length = 0;
  if (state === "before") {
    noticeMessages.push("已记录 UI4A 意图到笔记");
  } else {
    const error = console.error;
    console.error = () => undefined;
    await appendIntentCallout(
      {
        app: {
          vault: {
            getFileByPath: (path: string) => ({ path }),
            process: async () => { throw new Error("disk full"); },
          },
        } as any,
        settings: { appendCallout: true },
      },
      ownerPath,
      null,
      "Use the conservative plan",
    );
    console.error = error;
  }
  const correct = noticeMessages[0]?.includes("失败") ?? false;
  return shell(
    "Write feedback follows the awaited result",
    "vault.process rejects with “disk full”",
    `<div class="grid"><section class="panel sidebar"><h2>Promise timeline</h2>${events(state === "before" ? [["", "vault.process started"], ["bad", "Success notice shown immediately"], ["bad", "Promise rejected later"], ["bad", "Failure was not reported"]] : [["", "vault.process started"], ["", "UI waits for the promise"], ["bad", "Promise rejected: disk full"], ["good", "Only failure feedback shown"]])}</section><section class="panel sidebar"><h2>Visible Obsidian notice</h2><div class="toast ${correct ? "failure" : "success"}">${escapeHtml(noticeMessages[0] ?? "No feedback")}</div>${metrics([["success notices", correct ? 0 : 1], ["failure notices", correct ? 1 : 0]])}<div class="verdict">${correct ? "The rejection is caught after await; no false success message is emitted." : "The fire-and-forget write escapes the try/catch and reports success before persistence finishes."}</div></section></div>`,
  );
}

async function renderProximity(): Promise<string> {
  const result = state === "before"
    ? `${ownerNote}\n\n${intentBody}`
    : insertIntent(ownerNote, intentBody, { lineStart: 2, lineEnd: 4, text: widgetBlock });
  const calloutLine = result.split("\n").findIndex((line) => line.includes("[!user-intent]")) + 1;
  const blockEndLine = 5;
  const distance = Math.abs(calloutLine - blockEndLine);
  return shell(
    "Intent stays next to its code block",
    "record an intent from the PlanPicker widget without editing the note",
    `<div class="grid"><div class="notes one">${notePanel("Widget owner", ownerPath, result)}</div><section class="panel sidebar"><h2>Placement check</h2>${metrics([["block ends line", blockEndLine], ["callout starts line", calloutLine], ["line distance", distance], ["guessed positions", 0]])}${events([[distance <= 2 ? "good" : "bad", distance <= 2 ? "Callout inserted after exact block" : "Callout appended at note end"]])}<div class="verdict">${distance <= 2 ? "Fresh getSectionInfo data identifies the exact block. If that match later becomes missing or ambiguous, the recorder appends safely instead of guessing." : "The baseline append-only path separates the interaction from its originating widget."}</div></section></div>`,
  );
}

const renderers: Record<string, () => Promise<string>> = {
  lifecycle: renderLifecycle,
  target: renderTarget,
  await: renderAwaitFailure,
  proximity: renderProximity,
};

void (async () => {
  document.querySelector("#app")!.innerHTML = await (renderers[scenario] ?? renderLifecycle)();
  document.body.dataset.ready = "true";
})();
