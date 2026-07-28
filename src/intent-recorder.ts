import { Notice, type App } from "obsidian";

export interface IntentRecorderHost {
  app: App;
  settings: { appendCallout: boolean };
}

export type SourceSection = {
  lineStart: number;
  lineEnd: number;
  text: string;
};

/**
 * Record the widget intent in the note that owns the rendered code block.
 *
 * The captured section is used only when it still identifies one exact block.
 * If the note changed enough to make that location stale or ambiguous, append
 * to the owning note instead of guessing a position.
 */
export async function appendIntentCallout(
  plugin: IntentRecorderHost,
  sourcePath: string,
  sourceSection: SourceSection | null,
  prompt: string,
): Promise<void> {
  if (!plugin.settings.appendCallout) {
    new Notice(prompt);
    return;
  }

  const file = plugin.app.vault.getFileByPath(sourcePath);
  if (!file) {
    console.error(`[ui4a] source note not found: ${sourcePath}`);
    new Notice(`UI4A 意图写入失败：${prompt}`);
    return;
  }

  const body = `> [!user-intent]\n> ${prompt.replace(/\n/g, "\n> ")}\n`;

  try {
    await plugin.app.vault.process(file, (data: string) => {
      return insertIntent(data, body, sourceSection);
    });
    new Notice("已记录 UI4A 意图到笔记");
  } catch (err) {
    console.error("[ui4a] appendIntentCallout failed", err);
    new Notice(`UI4A 意图写入失败：${prompt}`);
  }
}

/** Pure insertion logic, exported for tests and the visual verification harness. */
export function insertIntent(
  note: string,
  body: string,
  sourceSection: SourceSection | null,
): string {
  const insertion = `\n\n${body}`;
  if (!sourceSection?.text) return appendAtEnd(note, insertion);

  const lines = note.split("\n");
  const expectedLines = sourceSection.text.split("\n");

  if (matchesAt(lines, expectedLines, sourceSection.lineStart)) {
    return insertAfterLine(note, sourceSection.lineStart + expectedLines.length - 1, insertion);
  }

  const matches: number[] = [];
  for (let index = 0; index <= lines.length - expectedLines.length; index += 1) {
    if (matchesAt(lines, expectedLines, index)) matches.push(index);
    if (matches.length > 1) break;
  }

  if (matches.length === 1) {
    return insertAfterLine(note, matches[0] + expectedLines.length - 1, insertion);
  }
  return appendAtEnd(note, insertion);
}

function matchesAt(lines: string[], expectedLines: string[], start: number): boolean {
  if (start < 0 || start + expectedLines.length > lines.length) return false;
  return expectedLines.every((line, offset) => lines[start + offset] === line);
}

function insertAfterLine(note: string, line: number, insertion: string): string {
  const lines = note.split("\n");
  const before = lines.slice(0, line + 1).join("\n");
  const after = lines.slice(line + 1).join("\n");
  return after ? `${before}${insertion}\n${after}` : `${before}${insertion}`;
}

function appendAtEnd(note: string, insertion: string): string {
  return note.endsWith("\n") ? note + insertion.slice(1) : note + insertion;
}
