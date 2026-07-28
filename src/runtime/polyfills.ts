/**
 * Runtime polyfill for `partial-react/render-context`, the one vendor
 * dependency that only the streaming web harness needs. In Obsidian we render
 * complete (non-streaming) modules, so the hook returns an inert default.
 */

// `partial-react/render-context` — used by genui/charts.tsx to replay partial
// streaming frames so charts don't blank-and-regrow mid-stream. Obsidian never
// streams, so we report a stable, complete frame.
// The empty scope string is deliberate: charts.tsx builds registry keys as
// `${rendererScope}:${id}`, and with a single non-streaming renderer there is
// nothing to disambiguate.
export function useGenUIRenderContext(): {
  rendererScope: string;
  streamingPartialFrame: boolean;
  nextStreamingRenderKey: (() => string) | undefined;
} {
  return { rendererScope: "", streamingPartialFrame: false, nextStreamingRenderKey: undefined };
}
