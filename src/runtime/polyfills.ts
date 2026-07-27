/**
 * Runtime polyfills for vendor modules that only the streaming/scoped web
 * harness needs. In Obsidian we render complete (non-streaming) modules into a
 * single UnoCSS-scoped root, so these hooks return inert defaults.
 */

// `partial-react/render-context` — used by genui/charts.tsx to replay partial
// streaming frames so charts don't blank-and-regrow mid-stream. Obsidian never
// streams, so we report a stable, complete frame.
export function useGenUIRenderContext(): {
  rendererScope: string | undefined;
  streamingPartialFrame: boolean;
  nextStreamingRenderKey: undefined;
} {
  return { rendererScope: undefined, streamingPartialFrame: false, nextStreamingRenderKey: undefined };
}

// `@genui/unocss` — createStyleScope/useStyleScope build a scoped UnoCSS engine.
// We handle styling globally via our own UnoCSS runtime (see styling.ts), so a
// null scope is correct: components render unscoped and the global engine
// already covers their classes.
export function createStyleScope(): null {
  return null;
}

export function useStyleScope(): null {
  return null;
}
