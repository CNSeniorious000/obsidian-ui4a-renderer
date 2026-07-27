import { type ReactNode, createElement } from "react";

/**
 * Resolve `[[target]]` / `[[target|alias]]` wikilinks inside a string into
 * clickable links that open the target note in Obsidian.
 *
 * The render host installs an opener on globalThis.__ui4a_open_note (bound to
 * app.workspace.openLinkText) when the widget mounts. If absent (e.g. tests),
 * links render as plain text — never crash.
 *
 * Usage in a widget:
 *   import { LinkText } from "$macaron/ui";
 *   <LinkText>核心人物：[[Demis Hassabis]]、[[John Jumper]]</LinkText>
 *   <LinkText>详见 [[AlphaFold|AF2 论文]]</LinkText>
 */
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

type OpenNoteFn = (target: string) => void;

function opener(): OpenNoteFn | undefined {
  return (globalThis as unknown as { __ui4a_open_note?: OpenNoteFn }).__ui4a_open_note;
}

/** Parse a string with wikilinks into an array of strings + link elements. */
export function parseWikilinks(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  WIKILINK_RE.lastIndex = 0;
  let i = 0;
  while ((m = WIKILINK_RE.exec(text)) !== null) {
    if (m.index > lastIndex) {
      nodes.push(text.slice(lastIndex, m.index));
    }
    const target = m[1].trim();
    const alias = m[2]?.trim() ?? target;
    const open = opener();
    nodes.push(
      createElement(
        "a",
        {
          key: `${keyPrefix}-link-${i++}`,
          href: "#",
          className: "ui4a-wikilink",
          "data-note": target,
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            open?.(target);
          },
        },
        alias
      )
    );
    lastIndex = WIKILINK_RE.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/**
 * Render children, parsing wikilinks in any plain-string segments. Pairs of
 * adjacent strings (text + link + text) are flattened into a fragment.
 */
export function LinkText({ children }: { children: ReactNode }): ReactNode {
  if (typeof children === "string") return createElement("span", null, parseWikilinks(children, "lt"));
  // Only string children carry wikilinks; leave elements/arrays untouched.
  if (Array.isArray(children)) {
    return createElement(
      "span",
      null,
      children.map((c, i) => (typeof c === "string" ? parseWikilinks(c, `lt${i}`) : c))
    );
  }
  return children;
}
