import {
  MarkdownRenderChild,
  type MarkdownPostProcessorContext,
  type App,
} from "obsidian";
import type * as ReactDOMClient from "react-dom/client";
import { mountWidget as mountReactWidget } from "./runtime/WidgetHost";
import {
  appendIntentCallout,
  type SourceSection,
} from "./intent-recorder";

/** Shape the processor needs from the plugin. */
export interface UI4APluginLike {
  app: App;
  settings: { appendCallout: boolean };
}

/**
 * Registers the ```ui4a fenced-codeblock processor.
 *
 * Each render owns a MarkdownRenderChild, so Obsidian controls the lifetime of
 * the outer React root when a preview is replaced, a leaf closes, or the plugin
 * unloads.
 */
export function registerCodeblockProcessor(plugin: UI4APluginLike & {
  registerMarkdownCodeBlockProcessor: (
    lang: string,
    cb: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => Promise<void> | void
  ) => void;
}) {
  plugin.registerMarkdownCodeBlockProcessor("ui4a", (source, el, ctx) => {
    ctx.addChild(new UI4AWidgetRenderChild(el, source, ctx, plugin));
  });
}

/** Owns the React root for exactly as long as Obsidian keeps this render alive. */
export class UI4AWidgetRenderChild extends MarkdownRenderChild {
  private root: ReactDOMClient.Root | null = null;

  constructor(
    containerEl: HTMLElement,
    private readonly code: string,
    private readonly context: MarkdownPostProcessorContext,
    private readonly plugin: UI4APluginLike,
  ) {
    super(containerEl);
  }

  onload() {
    this.containerEl.empty();
    this.containerEl.addClass("ui4a-host");
    this.containerEl.addClass("genui-root");

    const onUserIntent = (prompt: string) => {
      void appendIntentCallout(
        this.plugin,
        this.context.sourcePath,
        getSourceSection(this.context, this.containerEl),
        prompt,
      );
    };
    this.root = mountReactWidget(this.containerEl, this.code, onUserIntent, this.plugin.app);
  }

  onunload() {
    this.root?.unmount();
    this.root = null;
  }
}

function getSourceSection(
  ctx: MarkdownPostProcessorContext,
  el: HTMLElement,
): SourceSection | null {
  const section = ctx.getSectionInfo(el);
  if (!section) return null;

  const lines = section.text.split("\n");
  const lineCount = section.lineEnd - section.lineStart + 1;
  const start = lines.length > section.lineEnd ? section.lineStart : 0;
  return {
    lineStart: section.lineStart,
    lineEnd: section.lineEnd,
    text: lines.slice(start, start + lineCount).join("\n"),
  };
}
