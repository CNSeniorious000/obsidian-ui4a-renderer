// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { noticeMessages } from "./mocks/obsidian";

const mocks = vi.hoisted(() => ({
  mountWidget: vi.fn(),
  onUserIntent: undefined as ((prompt: string) => void) | undefined,
  unmount: vi.fn(),
}));

vi.mock("../src/runtime/WidgetHost", () => ({
  mountWidget: mocks.mountWidget,
}));

import {
  registerCodeblockProcessor,
  type UI4APluginLike,
} from "../src/codeblock-processor";
import {
  appendIntentCallout,
  insertIntent,
} from "../src/intent-recorder";

beforeEach(() => {
  mocks.mountWidget.mockReset();
  noticeMessages.length = 0;
  mocks.onUserIntent = undefined;
  mocks.unmount.mockReset();
  mocks.mountWidget.mockImplementation(
    (_el: HTMLElement, _code: string, onUserIntent: (prompt: string) => void) => {
      mocks.onUserIntent = onUserIntent;
      return { unmount: mocks.unmount };
    },
  );

  HTMLElement.prototype.empty = function empty() {
    this.replaceChildren();
  };
  HTMLElement.prototype.addClass = function addClass(...classes: string[]) {
    this.classList.add(...classes);
  };
});

describe("render lifecycle", () => {
  it("registers a MarkdownRenderChild that unmounts the owned React root", () => {
    let processor: ((source: string, el: HTMLElement, ctx: any) => void) | undefined;
    let child: { onload(): void; onunload(): void } | undefined;
    const plugin = {
      app: {},
      settings: { appendCallout: true },
      registerMarkdownCodeBlockProcessor: (_lang: string, callback: typeof processor) => {
        processor = callback;
      },
    } as unknown as Parameters<typeof registerCodeblockProcessor>[0];
    const context = {
      sourcePath: "Widgets/owner.md",
      addChild: (value: typeof child) => {
        child = value;
        value?.onload();
      },
      getSectionInfo: vi.fn(() => null),
    };

    processor = undefined;
    registerCodeblockProcessor(plugin);
    processor?.("export default () => null", document.createElement("div"), context);

    expect(mocks.mountWidget).toHaveBeenCalledOnce();
    expect(child).toBeDefined();
    child?.onunload();
    expect(mocks.unmount).toHaveBeenCalledOnce();
  });
});

describe("intent recording", () => {
  it("writes the sourcePath note near the exact rendered block", async () => {
    const sourceFile = { path: "Widgets/owner.md" };
    const note = [
      "# Owner",
      "```ui4a",
      "export default () => <button />",
      "```",
      "## Next section",
    ].join("\n");
    let written = "";
    const vault = {
      getFileByPath: vi.fn(() => sourceFile),
      process: vi.fn(async (_file: unknown, transform: (data: string) => string) => {
        written = transform(note);
        return written;
      }),
    };
    const plugin = {
      app: {
        vault,
        workspace: {
          getActiveFile: () => {
            throw new Error("active note must not be consulted");
          },
        },
      },
      settings: { appendCallout: true },
    } as unknown as UI4APluginLike;

    await appendIntentCallout(
      plugin,
      "Widgets/owner.md",
      {
        lineStart: 1,
        lineEnd: 3,
        text: ["```ui4a", "export default () => <button />", "```"].join("\n"),
      },
      "Save this choice",
    );

    expect(vault.getFileByPath).toHaveBeenCalledWith("Widgets/owner.md");
    expect(vault.process).toHaveBeenCalledWith(sourceFile, expect.any(Function));
    expect(written.indexOf("[!user-intent]")).toBeLessThan(written.indexOf("## Next section"));
    expect(noticeMessages).toEqual(["已记录 UI4A 意图到笔记"]);
  });

  it("waits for process resolution before showing success", async () => {
    let resolveProcess: ((value: string) => void) | undefined;
    const processResult = new Promise<string>((resolve) => {
      resolveProcess = resolve;
    });
    const plugin = {
      app: {
        vault: {
          getFileByPath: () => ({ path: "Widgets/owner.md" }),
          process: vi.fn(() => processResult),
        },
      },
      settings: { appendCallout: true },
    } as unknown as UI4APluginLike;

    const operation = appendIntentCallout(plugin, "Widgets/owner.md", null, "Wait for disk");
    await Promise.resolve();
    expect(noticeMessages).toEqual([]);

    resolveProcess?.("saved");
    await operation;
    expect(noticeMessages).toEqual(["已记录 UI4A 意图到笔记"]);
  });

  it("shows only failure feedback when process rejects", async () => {
    const plugin = {
      app: {
        vault: {
          getFileByPath: () => ({ path: "Widgets/owner.md" }),
          process: vi.fn(async () => {
            throw new Error("disk full");
          }),
        },
      },
      settings: { appendCallout: true },
    } as unknown as UI4APluginLike;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await appendIntentCallout(plugin, "Widgets/owner.md", null, "Retry me");

    expect(noticeMessages).toEqual(["UI4A 意图写入失败：Retry me"]);
    errorSpy.mockRestore();
  });
});

describe("safe proximity fallback", () => {
  const body = "> [!user-intent]\n> Choice\n";
  const block = "```ui4a\nexport default Widget\n```";

  it("relocates a uniquely moved block", () => {
    const result = insertIntent(
      `new heading\n${block}\nafter`,
      body,
      { lineStart: 0, lineEnd: 2, text: block },
    );

    expect(result.indexOf("[!user-intent]")).toBeLessThan(result.indexOf("after"));
  });

  it("appends rather than guessing when the captured block is ambiguous", () => {
    const result = insertIntent(
      `${block}\nmiddle\n${block}`,
      body,
      { lineStart: 99, lineEnd: 101, text: block },
    );

    expect(result.endsWith(body)).toBe(true);
  });
});
