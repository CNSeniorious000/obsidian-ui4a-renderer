import esbuild from "esbuild";

// Same aliases as esbuild.config.mjs so the harness exercises the exact
// production module graph; only the entry/format differ (browser IIFE).
await esbuild.build({
  entryPoints: ["demo/harness.tsx"],
  bundle: true,
  format: "iife",
  target: "es2022",
  logLevel: "info",
  outfile: "demo/harness.js",
  external: ["obsidian", "electron"],
  loader: { ".ts": "ts", ".tsx": "tsx", ".css": "text" },
  alias: {
    "@/components/ui": "./src/vendor/components/ui",
    "@/lib": "./src/vendor/lib",
    "@/hooks": "./src/vendor/hooks",
    "$macaron/ui": "./src/runtime/macaron-ui",
    "$macaron/ui/charts": "./src/vendor/genui/charts",
    "$macaron/chat": "./src/runtime/macaron-chat",
    "partial-react/render-context": "./src/runtime/polyfills",
    "@genui/unocss": "./src/runtime/polyfills",
  },
  mainFields: ["module", "main"],
});
