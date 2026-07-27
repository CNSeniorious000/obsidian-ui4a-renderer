/**
 * $macaron/ui adapter for Obsidian.
 *
 * The vendored library (src/vendor/macaron/source.tsx) IS the component registry:
 * its named exports are the 118 UI4A components. We re-export them so the runtime
 * can resolve `$macaron/ui` imports, and mirror the reference harness by also
 * stashing them on globalThis.__macaron_UI (used by genui/charts.tsx and any
 * widget that reaches for the global).
 */
import * as MacaronUI from "../vendor/macaron/source";

// Mirror the reference harness globals (set by web/src/genui-runtime.ts).
const g = globalThis as unknown as Record<string, unknown>;
g.__macaron_UI = MacaronUI;

export * from "../vendor/macaron/source";
export { LinkText } from "./wikilink";
export default MacaronUI;
