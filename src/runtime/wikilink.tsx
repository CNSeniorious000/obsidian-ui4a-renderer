import { type ReactNode, createElement } from "react";

/**
 * Resolve `[[target]]` / `[[target|alias]]` wikilinks inside a string into
 * clickable links that open the target note in Obsidian.
 *
 * The opener is bound per widget instance: the compiler injects a `LinkText`
 * closing over the mounting widget's `app.workspace.openLinkText` (see
 * compiler.ts), so links never route through a shared global that another
 * widget could overwrite or delete on unmount. Without an opener (e.g. tests),
 * links render as plain text — never crash.
 *
 * Usage in a widget:
 *   import { LinkText } from "$macaron/ui";
 *   <LinkText>核心人物：[[Demis Hassabis]]、[[John Jumper]]</LinkText>
 *   <LinkText>详见 [[AlphaFold|AF2 论文]]</LinkText>
 */
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export type OpenNoteFn = (target: string) => void;

/** Parse a string with wikilinks into an array of strings + link elements. */
export function parseWikilinks(text: string, keyPrefix: string, openNote?: OpenNoteFn): ReactNode[] {
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
            openNote?.(target);
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
 * Build the `LinkText` component for one widget instance, bound to that
 * widget's note opener. Renders children, parsing wikilinks in any
 * plain-string segments; pairs of adjacent strings (text + link + text) are
 * flattened into a fragment.
 */
export function createLinkText(openNote?: OpenNoteFn) {
  return function LinkText({ children }: { children: ReactNode }): ReactNode {
    if (typeof children === "string") return createElement("span", null, parseWikilinks(children, "lt", openNote));
    // Only string children carry wikilinks; leave elements/arrays untouched.
    if (Array.isArray(children)) {
      return createElement(
        "span",
        null,
        children.map((c, i) => (typeof c === "string" ? parseWikilinks(c, `lt${i}`, openNote) : c))
      );
    }
    return children;
  };
}

/** Unbound LinkText (no opener) — renders wikilinks as inert anchors. */
export const LinkText = createLinkText();
