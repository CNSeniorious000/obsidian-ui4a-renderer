import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [path.join(directory, "evidence.ts")],
  bundle: true,
  format: "iife",
  target: "es2022",
  outfile: path.join(directory, "dist/evidence.js"),
  plugins: [{
    name: "obsidian-verification-stubs",
    setup(build) {
      build.onResolve({ filter: /^obsidian$/ }, () => ({
        path: path.join(directory, "obsidian-stub.ts"),
      }));
      build.onResolve({ filter: /^\.\/runtime\/WidgetHost$/ }, (args) => {
        if (!args.importer.endsWith("src/codeblock-processor.ts")) return null;
        return { path: path.join(directory, "widget-host-stub.ts") };
      });
    },
  }],
});
