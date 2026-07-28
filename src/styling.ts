/**
 * UnoCSS runtime for UI4A widgets.
 *
 * The vendored components emit Tailwind-v3 utility classes as plain strings
 * (e.g. "flex gap-4 rounded-lg"); those classes don't exist at build time.
 * The reference harness uses @unocss/runtime with preset-wind3 + animations to
 * scan the DOM and inject matching CSS on the fly. We do the same, globally,
 * keyed off the `.genui-root` scope so generated rules only apply inside
 * widgets and never leak into Obsidian's own UI.
 */
import { createGenerator } from "@unocss/core";
import presetWind3 from "@unocss/preset-wind3";
import presetAnimations from "unocss-preset-animations";
import { unoTheme, unoShortcuts, unoRules } from "./vendor/lib/standalone-uno";

let enginePromise: Promise<ReturnType<typeof createGenerator>> | null = null;

function getEngine(): Promise<ReturnType<typeof createGenerator>> {
  if (enginePromise) return enginePromise;
  enginePromise = createGenerator({
    // Map `dark:`/`light:` onto Obsidian's own body classes. Nobody ever adds a
    // `.dark` class in this plugin, so the default `dark: "class"` strategy
    // produced dead selectors; `.theme-dark`/`.theme-light` are what Obsidian
    // actually toggles at runtime.
    presets: [presetWind3({ dark: { dark: ".theme-dark", light: ".theme-light" } }), presetAnimations()],
    theme: unoTheme,
    shortcuts: unoShortcuts,
    rules: unoRules,
  });
  return enginePromise;
}

/** Element classes observed last time we injected — used to diff and avoid
 * redundant re-injections on mutation. */
let injectedClassSet = new Set<string>();
let preflightInjected = false;
let styleEl: HTMLStyleElement | null = null;

function ensureStyleEl(): HTMLStyleElement {
  if (styleEl && document.head.contains(styleEl)) return styleEl;
  styleEl = document.createElement("style");
  styleEl.setAttribute("data-ui4a-uno", "");
  document.head.appendChild(styleEl);
  return styleEl;
}

/**
 * Scan all `.genui-root` subtrees for class tokens, generate CSS for any new
 * ones, and inject under the `.genui-root` scope. Call after each render and
 * on DOM mutations within widget containers.
 */
export async function refreshStyles(scope: ParentNode = document): Promise<void> {
  const roots = scope.querySelectorAll<HTMLElement>(".genui-root");
  if (!roots.length) return;

  const tokenSet = new Set<string>();
  roots.forEach((root) => {
    root.querySelectorAll("*").forEach((el) => {
      const cls = el.getAttribute("class");
      if (!cls) return;
      for (const t of cls.split(/\s+/)) if (t) tokenSet.add(t);
    });
  });

  // Only generate for tokens we haven't already injected.
  const fresh = [...tokenSet].filter((t) => !injectedClassSet.has(t));
  if (fresh.length === 0 && preflightInjected) return;

  const engine = await getEngine();
  const { css } = await engine.generate(fresh.join(" "), { preflights: true });
  if (!css.trim()) return;

  // Re-scope every rule under `.genui-root` so utilities never bleed into
  // Obsidian's own UI. This also scopes the preflight variable defaults.
  const scoped = scopeCss(css);

  const el = ensureStyleEl();
  el.textContent = (el.textContent ?? "") + "\n" + scoped;
  fresh.forEach((t) => injectedClassSet.add(t));
  preflightInjected = true;
}

/**
 * Prefix every CSS rule's selector with `.genui-root`. Handles multi-rule CSS
 * blocks (preflights + utilities), skipping @-rules other than selectors.
 * Scoping the preflight `*,::before,::after` rule to `.genui-root *` keeps the
 * UnoCSS variable defaults (shadow/border/etc.) inside widgets only.
 * Selectors carrying a theme-ancestor class (`.theme-dark .foo`) are hoisted
 * instead: `.theme-dark .genui-root .foo`.
 */
function scopeCss(css: string): string {
  // Split into top-level rules by tracking brace depth.
  const rules: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of css) {
    buf += ch;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        rules.push(buf);
        buf = "";
      }
    }
  }
  if (buf.trim()) rules.push(buf);

  return rules
    .map((rule) => {
      const m = rule.match(/^([^{}]*)(\{[\s\S]*\})\s*$/);
      if (!m) return rule;
      let [, selector, body] = m;
      selector = selector.trim();
      // Pass through @media/@keyframes/@font-face blocks by recursing their body.
      if (selector.startsWith("@")) {
        return `${selector}${scopeAtRuleBody(body)}`;
      }
      const scoped = selector
        .split(",")
        .map((s) => {
          const sel = s.trim();
          if (!sel) return sel;
          if (sel.startsWith(".genui-root")) return sel;
          // Theme selectors (`.theme-dark .foo`) must keep the theme class
          // *above* the scope: it lives on <body>, an ancestor of
          // `.genui-root`. A blind `.genui-root ${sel}` would demote it to a
          // descendant and never match.
          const themed = sel.match(/^(\.theme-dark|\.theme-light)(\s.+)$/);
          if (themed) return `${themed[1]} .genui-root ${themed[2].trim()}`;
          return `.genui-root ${sel}`;
        })
        .join(", ");
      return `${scoped}${body}`;
    })
    .join("\n");
}

/** For @media/@keyframes, scope the selectors inside the block body. */
function scopeAtRuleBody(body: string): string {
  const inner = body.replace(/^\{|\}$/g, "");
  return `{${scopeCss(inner)}}`;
}
