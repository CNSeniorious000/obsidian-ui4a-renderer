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

type UnoEngine = Awaited<ReturnType<typeof createGenerator>>;

let enginePromise: Promise<UnoEngine> | null = null;

function getEngine(): Promise<UnoEngine> {
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

/** Class tokens already handed to UnoCSS, including tokens that produced no
 * rules. Keeping negative results avoids retrying them on every mutation.
 * Marked eagerly (before `generate` resolves) so concurrent refreshes never
 * request the same token twice. */
const processedClassSet = new Set<string>();
let preflightInjected = false;
let styleEl: HTMLStyleElement | null = null;
let lifecycle = 0;

function ensureStyleEl(): HTMLStyleElement {
  if (styleEl && document.head.contains(styleEl)) return styleEl;
  styleEl = document.createElement("style");
  styleEl.setAttribute("data-ui4a-uno", "");
  document.head.appendChild(styleEl);
  return styleEl;
}

/**
 * Scan the supplied widget subtree for class tokens, generate CSS for any new
 * ones, and inject under the `.genui-root` scope. Passing `document` scans all
 * widgets and is reserved for infrequent lifecycle/layout refreshes.
 */
export async function refreshStyles(scope: ParentNode = document): Promise<void> {
  const tokenSet = collectClassTokens(scope);
  if (!tokenSet) return;

  const fresh = [...tokenSet].filter((token) => !processedClassSet.has(token));
  const includePreflight = !preflightInjected;
  if (fresh.length === 0 && !includePreflight) return;

  fresh.forEach((token) => processedClassSet.add(token));
  preflightInjected = true;
  const refreshLifecycle = lifecycle;

  const engine = await getEngine();
  const { css } = await engine.generate(fresh.join(" "), { preflights: includePreflight });

  // Plugin unload invalidates in-flight work so it cannot recreate styles.
  if (refreshLifecycle !== lifecycle) return;
  if (!css.trim()) return;

  // Re-scope every rule under `.genui-root` so utilities never bleed into
  // Obsidian's own UI. This also scopes the preflight variable defaults.
  const el = ensureStyleEl();
  el.textContent = (el.textContent ?? "") + "\n" + scopeCss(css);
}

/**
 * Observe one widget only and collapse all mutations in the current frame into
 * a single refresh. Returns a disposer for the widget's React lifecycle.
 */
export function observeWidgetStyles(widgetRoot: HTMLElement): () => void {
  let animationFrame: number | null = null;

  const scheduleRefresh = () => {
    if (animationFrame !== null) return;
    animationFrame = requestAnimationFrame(() => {
      animationFrame = null;
      void refreshStyles(widgetRoot);
    });
  };

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(widgetRoot, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
  });
  scheduleRefresh();

  return () => {
    observer.disconnect();
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  };
}

/** Remove generated CSS and reset caches so a later plugin reload regenerates it. */
export function removeRuntimeStyles(): void {
  lifecycle++;
  styleEl?.remove();
  styleEl = null;
  processedClassSet.clear();
  preflightInjected = false;
}

/** Collect tokens from a widget subtree, or from every widget for document scans. */
function collectClassTokens(scope: ParentNode): Set<string> | null {
  const containers: Element[] = [];

  if (scope instanceof Element && scope.closest(".genui-root")) {
    containers.push(scope);
  } else {
    containers.push(...scope.querySelectorAll(".genui-root"));
  }
  if (containers.length === 0) return null;

  const tokens = new Set<string>();
  const addElementClasses = (element: Element) => {
    for (const token of element.classList) tokens.add(token);
  };

  containers.forEach((container) => {
    addElementClasses(container);
    container.querySelectorAll("*").forEach(addElementClasses);
  });
  return tokens;
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
      // UnoCSS prefixes each layer's first rule with a `/* layer: … */` comment.
      // Left in place it becomes part of the selector text, so `.flex` would be
      // scoped as `/* layer: default */ .flex` — a selector that never matches
      // and therefore leaks the utility to all of Obsidian.
      const comments = selector.match(/\/\*[\s\S]*?\*\//g)?.join("") ?? "";
      selector = selector.replace(/\/\*[\s\S]*?\*\//g, "").trim();
      // Pass through @media/@keyframes/@font-face blocks by recursing their body.
      if (selector.startsWith("@")) {
        return `${comments}${selector}${scopeAtRuleBody(body)}`;
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
      return `${comments}${scoped}${body}`;
    })
    .join("\n");
}

/** For @media/@keyframes, scope the selectors inside the block body. */
function scopeAtRuleBody(body: string): string {
  const inner = body.replace(/^\{|\}$/g, "");
  return `{${scopeCss(inner)}}`;
}
