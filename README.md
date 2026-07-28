# obsidian-ui4a-renderer

Render **UI4A-protocol** TSX widgets as interactive React components inside
Obsidian notes. Each `​```ui4a` fenced codeblock is compiled and mounted in
place — the companion **genui-builder** skill generates the TSX, this plugin
renders it.

A port of [MindLab-Research/macaron-artifacts](https://github.com/MindLab-Research/macaron-artifacts)
adapted to Obsidian's note-graph paradigm.

> **Companion skill:** [Ori-Replication/obsidian-ui4a-skill](https://github.com/Ori-Replication/obsidian-ui4a-skill) — the authoring skill that teaches an agent to emit `​```ui4a` widgets.

## How it differs from the web harness

| | web (macaron-artifacts) | Obsidian (this plugin) |
|---|---|---|
| Compiler | `partial-react` streaming | `sucrase` one-shot |
| Trigger | streaming `input_json_delta` | a complete `​```ui4a` codeblock |
| `sendUserMessage` | injects a chat turn | appends a `> [!user-intent]` callout |
| Components | 118-export registry | same (vendored verbatim) |
| Styling | `@unocss/runtime` global | `@unocss/core` engine, scoped to `.genui-root` |

> [!CAUTION]
> **A `​```ui4a` block is executable code, not data.** The plugin compiles the
> block's TSX and runs it with `new Function` inside Obsidian's Electron
> renderer. The `require()` shim only whitelists which *modules* a widget may
> import — it does **not** sandbox the code, which still reaches `window`,
> `require`, `process` and your `app` instance. Opening a note therefore means
> running whatever that note contains, with your full local privileges.
> Only enable this plugin on vaults whose notes you trust; treat a shared or
> downloaded vault containing `​```ui4a` blocks exactly as you would treat an
> untrusted executable. Real isolation (iframe/worker) is not implemented.

## Install

1. Copy `main.js`, `manifest.json`, `styles.css` into
   `<vault>/.obsidian/plugins/ui4a-renderer/`.
2. Build from source: `npm install && node esbuild.config.mjs`.
3. Obsidian → Settings → Community plugins → disable Safe Mode → enable **UI4A Renderer**.

## Use

````markdown
```ui4a
import { useState } from "react";
import { Stack, Card, CardHeader, CardTitle, Button, Badge } from "$macaron/ui";
import { sendUserMessage } from "$macaron/chat";

export default function App() {
  const [n, setN] = useState(0);
  return (
    <Card>
      <CardHeader><CardTitle>计数器</CardTitle></CardHeader>
      <Stack>
        <Badge>点击 {n} 次</Badge>
        <Button onClick={() => { setN(n + 1); sendUserMessage("计数到 " + (n + 1)); }}>+1</Button>
      </Stack>
    </Card>
  );
}
```
````

Clicking `+1` calls `sendUserMessage`, which appends a `> [!user-intent]`
callout to the active note.

## Architecture

```
src/
  main.ts                 plugin entry: codeblock processor, styles, UnoCSS observer
  codeblock-processor.ts  ```ui4a processor → mounts WidgetHost, bridges sendUserMessage→callout
  styling.ts              UnoCSS runtime engine (preset-wind3), scoped to .genui-root
  settings-tab.ts         settings UI for the appendCallout toggle
  runtime/
    compiler.ts           sucrase transpile + require() shim registry → App component
    WidgetHost.tsx        compile + mount + ErrorBoundary + $app/chat bridge
    ErrorBoundary.tsx     catches render errors inline
    macaron-ui.ts         $macaron/ui adapter (re-exports vendored source + LinkText)
    macaron-chat.ts        $macaron/chat adapter (sendUserMessage)
    wikilink.tsx          <LinkText> — UI-internal [[wikilinks]]
    polyfills.ts          no-op stub for partial-react/render-context
  vendor/                 macaron component library (vendored, see NOTICE)
```

See `src/skill/` (or the companion skill repo) for the authoring spec and the
full 118-component catalog.

## License

MIT. The vendored macaron component library is © MindLab Research; see
[NOTICE](NOTICE) for attribution and the upstream commit it was vendored from.
