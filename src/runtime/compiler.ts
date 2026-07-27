/**
 * TSX → module compiler for UI4A widgets in Obsidian.
 *
 * The reference harness streams TSX and compiles partial frames with
 * `partial-react`'s `createTsxCompiler`, resolving bare imports through an
 * import-map of locally-served shim files. Obsidian doesn't stream (the
 * Skill emits a complete TSX module into a fenced codeblock), so we don't need
 * partial-tolerant compilation — only: transpile TSX → CJS, then resolve its
 * bare imports (`react`, `$macaron/ui`, …) against our bundled modules.
 *
 * Transpiler: sucrase — a single synchronous, in-process transform that strips
 * TS types, converts JSX to the automatic runtime, and compiles ESM→CJS. We
 * deliberately avoid esbuild-wasm here: it pulls a 12 MB wasm binary + a Web
 * Worker for no benefit over a pure in-process transpile (we don't stream),
 * and adds an async init step. sucrase is ~200 KB, zero assets, fully offline.
 */
import { transform } from "sucrase";
import * as React from "react";
import * as ReactDOMClient from "react-dom/client";
// The automatic JSX runtime lives in its own module entry, not on `react`
// itself — React 19 does not export `jsx`/`jsxs` from the main package.
import * as JSXRuntime from "react/jsx-runtime";

// Exposed so hosts/tests can render with the SAME React instance the widget's
// hooks resolved to (via REGISTRY) — avoids "Invalid hook call" from two copies.
export { React, ReactDOMClient };

// $macaron/ui — the 118-export registry, plus the Obsidian-only LinkText helper.
import * as MacaronUI from "../vendor/macaron/source";
import { LinkText } from "./wikilink";
// $macaron/ui/charts — Recharts-backed chart primitives.
import * as MacaronCharts from "../vendor/genui/charts";
// $macaron/chat — sendUserMessage bridge.
import { sendUserMessage } from "./macaron-chat";
// lucide-react icons.
import * as LucideReact from "lucide-react";
// motion/react — animation primitives (motion, AnimatePresence, …).
import * as Motion from "motion/react";

export type CompiledWidget = {
  /** The default export — typically `function App()`. */
  App: React.ComponentType<Record<string, unknown>>;
  /** The module namespace, in case named exports are needed. */
  module: Record<string, unknown>;
};

/**
 * Bare-specifier → module registry. Each entry is what a widget's
 * `import … from "<specifier>"` resolves to. We expose the React namespace
 * (so `useState` etc. destructure correctly) plus the named-export namespaces.
 */
const REGISTRY: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": JSXRuntime,
  "react/jsx-dev-runtime": JSXRuntime,
  "react-dom": ReactDOMClient,
  "react-dom/client": ReactDOMClient,
  "$macaron/ui": { ...MacaronUI, LinkText },
  "$macaron/ui/charts": MacaronCharts,
  "$macaron/chat": { sendUserMessage },
  "lucide-react": LucideReact,
  "motion/react": Motion,
  "motion": Motion,
};

/**
 * Transpile + evaluate a UI4A TSX module and return its default export.
 * Throws on transpile or evaluation errors — the caller surfaces them in the UI.
 *
 * Synchronous: one in-process pass. No wasm, no worker, no init step.
 */
export function compileWidget(code: string): CompiledWidget {
  // typescript: strip TS types. jsx: JSX → automatic runtime (react/jsx-runtime).
  // imports: ESM → CommonJS so the result runs under a `require()` shim.
  // production: use react/jsx-runtime (not jsx-dev-runtime), drop dev markers.
  const { code: js } = transform(code, {
    transforms: ["typescript", "jsx", "imports"],
    jsxRuntime: "automatic",
    production: true,
  });

  const moduleExports: Record<string, unknown> = {};
  const moduleObj = { exports: moduleExports };

  // `require` resolves bare specifiers against the bundled registry. Any import
  // not in the registry (e.g. a stray `import _ from "foo"`) throws clearly.
  const require = (specifier: string): unknown => {
    if (specifier in REGISTRY) return REGISTRY[specifier];
    throw new Error(
      `[ui4a] Cannot resolve import "${specifier}". UI4A widgets may only import from react, $macaron/ui, $macaron/ui/charts, $macaron/chat, lucide-react, and motion/react.`
    );
  };

  // Wrap in a function so the transpiled CJS sees its own `module`/`exports`/`require`.
  const factory = new Function("module", "exports", "require", js);
  factory(moduleObj, moduleExports, require);

  const App = moduleExports.default;
  if (typeof App !== "function" && typeof App !== "object") {
    throw new Error(
      "[ui4a] Module does not export a default component. A UI4A widget must `export default function App() { … }`."
    );
  }

  return { App: App as React.ComponentType<Record<string, unknown>>, module: moduleExports };
}
