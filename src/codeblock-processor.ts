import { type MarkdownPostProcessorContext, Notice, type App, type Vault } from "obsidian";
import { mountWidget as mountReactWidget } from "./runtime/WidgetHost";

/** Shape the processor needs from the plugin. */
export interface UI4APluginLike {
  app: App;
  settings: { appendCallout: boolean };
}

/**
 * Registers the ```ui4a fenced-codeblock processor.
 *
 * Obsidian renders a fenced codeblock's *content* verbatim; we intercept
 * ```ui4a blocks, read the raw TSX (source), mount a WidgetHost, and bridge
 * sendUserMessage into a [!user-intent] callout on the active note.
 */
export function registerCodeblockProcessor(plugin: UI4APluginLike & {
  registerMarkdownCodeBlockProcessor: (
    lang: string,
    cb: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => Promise<void> | void
  ) => void;
}) {
  plugin.registerMarkdownCodeBlockProcessor("ui4a", (source, el, _ctx) => {
    mountWidget(el, source, plugin);
  });
}

function mountWidget(el: HTMLElement, code: string, plugin: UI4APluginLike) {
  el.empty();
  el.addClass("ui4a-host");
  el.addClass("genui-root"); // scope UnoCSS utilities to this widget

  const onUserIntent = (prompt: string) => appendIntentCallout(plugin, prompt);
  mountReactWidget(el, code, onUserIntent, plugin.app);
}

/**
 * Append the widget's intent to the active note as a callout, so an interaction
 * becomes a durable, linkable record and serves as context for the next run.
 *
 * Uses the active editor (live-preview-aware) when available so the callout is
 * inserted and rendered immediately; falls back to a vault file write.
 */
function appendIntentCallout(plugin: UI4APluginLike, prompt: string) {
  if (!plugin.settings.appendCallout) {
    new Notice(prompt);
    return;
  }

  const body = `\n\n> [!user-intent]\n> ${prompt.replace(/\n/g, "\n> ")}\n`;

  // Preferred path: edit through the active editor (works in live preview + source).
  let editor: import("obsidian").Editor | null = null;
  const leaf = plugin.app.workspace.activeEditor;
  if (leaf?.editor) editor = leaf.editor;

  const file = leaf?.file ?? plugin.app.workspace.getActiveFile();
  if (!file) {
    new Notice(`UI4A 意图：${prompt}`);
    return;
  }

  try {
    if (editor) {
      // Append at the end of the editor buffer; the view re-renders automatically.
      const lastLine = editor.lastLine();
      const lastLineText = editor.getLine(lastLine);
      const insertion = (lastLineText.trim() === "" ? body.slice(2) : body);
      editor.replaceRange(insertion, { line: lastLine, ch: lastLineText.length });
    } else {
      // Fallback: write the file directly (reading view / no active editor).
      void plugin.app.vault.process(file.path, (data: string) => {
        return data.endsWith("\n") ? data + body.slice(2) : data + body;
      });
    }
  } catch (err) {
    console.error("[ui4a] appendIntentCallout failed", err);
    new Notice(`UI4A 意图（写入失败，已复制）：${prompt}`);
    return;
  }
  new Notice("已记录 UI4A 意图到笔记");
}
