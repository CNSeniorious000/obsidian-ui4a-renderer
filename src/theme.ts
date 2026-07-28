/**
 * Subscribable color-scheme bridge for UI4A widgets.
 *
 * Widgets are compiled at runtime and can only reach host state through
 * `globalThis`. The previous bridge exposed `__ui4a_theme` as a bare string,
 * which widgets could read once but never subscribe to — so an Obsidian theme
 * switch left mounted widgets stale until a full remount. This module keeps
 * the string for one-shot reads and adds `__ui4a_on_theme(cb)`, an unsubscribe-
 * returning subscription that fires synchronously on every theme flip.
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
  if (theme !== current) {
    current = theme;
    listeners.forEach((listener) => listener(theme));
  }
  return theme;
}
