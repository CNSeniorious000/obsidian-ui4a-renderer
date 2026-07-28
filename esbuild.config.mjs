import esbuild from "esbuild";

const prod = !process.argv.includes("--watch");
const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  target: "es2022",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  external: ["obsidian", "electron"],
  loader: { ".ts": "ts", ".tsx": "tsx", ".css": "text" },
  // Map the bare specifiers the vendored library uses onto real modules,
  // and alias $macaron/* to our adapter modules.
  alias: {
    "@/components/ui": "./src/vendor/components/ui",
    "@/lib": "./src/vendor/lib",
    "@/hooks": "./src/vendor/hooks",
    "$macaron/ui": "./src/runtime/macaron-ui",
    "$macaron/ui/charts": "./src/vendor/genui/charts",
    "$macaron/chat": "./src/runtime/macaron-chat",
    // The one vendor module that only the streaming web harness needs.
    "partial-react/render-context": "./src/runtime/polyfills",
  },
  // recharts / motion / embla are CJS-friendly; let esbuild handle them.
  mainFields: ["module", "main"],
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("watching…");
} else {
  await esbuild.build(options);
}
