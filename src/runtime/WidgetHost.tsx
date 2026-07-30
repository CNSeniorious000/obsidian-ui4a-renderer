import { useEffect, useRef, useState, createElement } from "react";
import * as ReactDOMClient from "react-dom/client";
import { compileWidget, type CompiledWidget } from "./compiler";
import { ErrorBoundary } from "./ErrorBoundary";
import { observeWidgetStyles } from "../styling";
import type { App } from "obsidian";

export type WidgetHostProps = {
  code: string;
  /** Called when the widget calls sendUserMessage(prompt). */
  onUserIntent?: (prompt: string) => void;
};

/**
 * Mounts a UI4A widget: compiles the TSX, then renders the widget's default
 * export inside an ErrorBoundary. Sets the $app/chat bridge on globalThis for
 * the lifetime of the mount so sendUserMessage routes to onUserIntent.
 */
export function WidgetHost({ code, onUserIntent, app }: WidgetHostProps & { app?: App }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<ReactDOMClient.Root | null>(null);
  const [status, setStatus] = useState<"idle" | "compiling" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [widget, setWidget] = useState<CompiledWidget | null>(null);

  // (Re)compile whenever the code changes. compileWidget is synchronous
  // (sucrase transpiles in-process), so no async/loading state is needed.
  useEffect(() => {
    try {
      setWidget(compileWidget(code));
      setStatus("ready");
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [code]);

  // Register the chat bridge + wikilink opener while mounted.
  useEffect(() => {
    const g = globalThis as unknown as Record<string, unknown>;
    g["$app/chat"] = (prompt: string) => onUserIntent?.(prompt);
    if (app) {
      g.__ui4a_open_note = (target: string) => app.workspace.openLinkText(target, "", false);
    }
    return () => {
      delete g["$app/chat"];
      delete g.__ui4a_open_note;
    };
  }, [onUserIntent, app]);

  // Mount/unmount the widget root.
  useEffect(() => {
    if (status !== "ready" || !widget || !containerRef.current) return;
    const container = containerRef.current;
    const stopObservingStyles = observeWidgetStyles(container);
    const root = ReactDOMClient.createRoot(container);
    rootRef.current = root;
    root.render(
      <ErrorBoundary>
        <widget.App />
      </ErrorBoundary>
    );
    return () => {
      stopObservingStyles();
      root.unmount();
      rootRef.current = null;
    };
  }, [status, widget]);

  if (status === "error") {
    return (
      <pre className="ui4a-error">{error}</pre>
    );
  }
  return <div className="ui4a-widget" ref={containerRef} />;
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
