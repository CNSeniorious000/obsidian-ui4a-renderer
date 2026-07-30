import { useEffect, useRef, useState, createElement } from "react";
import * as ReactDOMClient from "react-dom/client";
import { compileWidget, type CompiledWidget } from "./compiler";
import { ErrorBoundary } from "./ErrorBoundary";
import { pushChatBridge } from "./macaron-chat";
import { refreshStyles } from "../styling";
import type { App } from "obsidian";

export type WidgetHostProps = {
  code: string;
  /** Called when the widget calls sendUserMessage(prompt). */
  onUserIntent?: (prompt: string) => void;
};

/**
 * Mounts a UI4A widget: compiles the TSX, then renders the widget's default
 * export inside an ErrorBoundary — directly in the host's React tree (no
 * nested createRoot). The widget's $macaron/chat and LinkText bridges are
 * injected per instance at compile time, so concurrent widgets stay isolated.
 */
export function WidgetHost({ code, onUserIntent, app }: WidgetHostProps & { app?: App }) {
  const [error, setError] = useState<string | null>(null);
  const [widget, setWidget] = useState<CompiledWidget | null>(null);
  // Bumped per successful compile; used as the ErrorBoundary key so a
  // recompiled widget starts with a fresh boundary (old behavior got this
  // for free from the fresh root per compile).
  const [compileId, setCompileId] = useState(0);

  // The injected bridges read the host props through a ref, so a caller that
  // passes an inline onUserIntent doesn't recompile (and thus remount, losing
  // widget state) on every render. Only `code` and whether a bridge exists at
  // all drive recompilation — an absent bridge must stay absent so
  // sendUserMessage keeps its clipboard fallback.
  const hostRef = useRef({ onUserIntent, app });
  hostRef.current = { onUserIntent, app };
  const hasIntent = Boolean(onUserIntent);
  const hasApp = Boolean(app);

  // (Re)compile whenever the code changes. compileWidget is synchronous
  // (sucrase transpiles in-process), so no loading state is needed. The bridge
  // closures are baked into the compiled module's imports, keeping this
  // widget's sendUserMessage / wikilink opener isolated from others.
  useEffect(() => {
    try {
      setWidget(
        compileWidget(code, {
          sendUserMessage: hasIntent ? (prompt) => hostRef.current.onUserIntent?.(prompt) : undefined,
          openNote: hasApp ? (target) => void hostRef.current.app?.workspace.openLinkText(target, "", false) : undefined,
        })
      );
      setError(null);
      setCompileId((n) => n + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [code, hasIntent, hasApp]);

  // Safety net for widgets that call bare sendUserMessage without importing it:
  // register this widget's dispatcher while mounted. Stack-based, so unmounting
  // a sibling widget never severs this one's fallback.
  useEffect(() => {
    if (!hasIntent) return;
    return pushChatBridge((prompt) => hostRef.current.onUserIntent?.(prompt));
  }, [hasIntent]);

  // Scan the just-mounted DOM for utility classes and inject UnoCSS rules.
  // Two passes: once after mount to catch the first paint, once after the
  // microtask queue (catches async child renders / charts).
  useEffect(() => {
    if (!widget) return;
    void refreshStyles();
    const id = setTimeout(() => void refreshStyles(), 0);
    return () => clearTimeout(id);
  }, [widget]);

  if (error !== null) return <pre className="ui4a-error">{error}</pre>;
  return (
    <div className="ui4a-widget">
      {/* key resets the boundary when a recompile yields a new widget module,
          matching the old fresh-root-per-compile behavior. */}
      <ErrorBoundary key={compileId}>{widget ? <widget.App /> : null}</ErrorBoundary>
    </div>
  );
}

/**
 * Imperative mount helper for the codeblock processor: create a React root on
 * the host element and render a WidgetHost into it. Returns the root so the
 * caller could unmount later if needed.
 */
export function mountWidget(
  el: HTMLElement,
  code: string,
  onUserIntent?: (prompt: string) => void,
  app?: import("obsidian").App
): ReactDOMClient.Root {
  const root = ReactDOMClient.createRoot(el);
  root.render(createElement(WidgetHost, { code, onUserIntent, app }));
  return root;
}
