/**
 * Subscribable color-scheme bridge for UI4A widgets.
 *
 * Widgets are compiled at runtime and can only reach host state through
 * `globalThis`. The previous bridge exposed `__ui4a_theme` as a bare string,
 * which widgets could read once but never subscribe to — so an Obsidian theme
 * switch left mounted widgets stale until a full remount. This module keeps
 * the string for one-shot reads and adds two functions, making the bridge
 * bidirectional: `__ui4a_on_theme(cb)` (host → widget, fires synchronously on
 * every flip) and `__ui4a_set_theme(pref)` (widget → host, routed into
 * Obsidian's own theme setting so every widget sees the change).
 *
 * `dark:` utilities don't need this — they key off Obsidian's own
 * `body.theme-dark` class in CSS, so they repaint on their own. The store is
 * for widgets that branch on the theme in JS (chart palettes, images, …).
 */
export type UI4ATheme = "dark" | "light";

type ThemeListener = (theme: UI4ATheme) => void;

const listeners = new Set<ThemeListener>();
let current: UI4ATheme | null = null;

/** Read Obsidian's current color scheme off the body class. */
export function getTheme(): UI4ATheme {
  return document.body.classList.contains("theme-dark") ? "dark" : "light";
}

/** Subscribe to theme changes; returns an unsubscribe function. */
export function onThemeChange(listener: ThemeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Widget-facing preference: an explicit scheme, or "system" to follow the OS. */
export type UI4AThemePreference = UI4ATheme | "system";

/** Host-side applier, injected by main.ts (writes Obsidian's theme config). */
let applyPreference: ((pref: UI4AThemePreference) => void) | null = null;

export function initThemeBridge(apply: (pref: UI4AThemePreference) => void): void {
  applyPreference = apply;
}

/**
 * Widget → host direction of the bridge. A widget calls
 * `globalThis.__ui4a_set_theme("dark" | "light" | "system")` (e.g. from its own
 * theme toggle); we route the request to Obsidian, and the resulting body-class
 * change re-enters syncTheme, so the new theme flows back to every subscriber
 * through the same path as a host-initiated switch. Single source of truth:
 * Obsidian's body class.
 */
export function setThemePreference(pref: UI4AThemePreference): void {
  applyPreference?.(pref);
}

/**
 * Re-read the body class, refresh the globalThis bridge, and notify
 * subscribers if the theme actually changed. Idempotent — safe to call from
 * every theme signal (css-change, body-class mutation, plugin load).
 */
export function syncTheme(): UI4ATheme {
  const theme = getTheme();
  const g = globalThis as unknown as Record<string, unknown>;
  g.__ui4a_theme = theme;
  g.__ui4a_on_theme = onThemeChange;
  g.__ui4a_set_theme = setThemePreference;
  if (theme !== current) {
    current = theme;
    listeners.forEach((listener) => listener(theme));
  }
  return theme;
}
