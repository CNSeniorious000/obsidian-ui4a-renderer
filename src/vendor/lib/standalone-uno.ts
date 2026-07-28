import type { Rule, UserShortcuts } from "@unocss/core";
import type { Theme } from "@unocss/preset-wind3";

/**
 * Token consumption for the vendored components.
 *
 * The shadcn-style tokens (`--card`, `--primary`, …) are defined in
 * styles.css as *aliases to Obsidian's own CSS variables*
 * (--background-primary, --text-normal, --interactive-accent, …), so widgets
 * follow the host theme — including community themes — the way VS Code
 * extensions follow --vscode-* variables. Those aliases resolve to complete
 * color values (hex/rgb/var chains), not HSL triplets, so we can't consume
 * them with `hsl(var(--x))`. The color-mix form below keeps UnoCSS's alpha
 * modifiers (`bg-card/80`) working: without an explicit <alpha-value>
 * placeholder the modifier would be silently dropped for var() colors.
 */
const tok = (name: string) => `color-mix(in srgb, var(--${name}) calc(<alpha-value> * 100%), transparent)`;
const withForeground = (name: string) => ({ DEFAULT: tok(name), foreground: tok(`${name}-foreground`) });

export const unoTheme: Theme = {
  colors: {
    border: tok("border"),
    input: tok("input"),
    ring: tok("ring"),
    background: tok("background"),
    foreground: tok("foreground"),
    primary: withForeground("primary"),
    secondary: withForeground("secondary"),
    destructive: withForeground("destructive"),
    muted: withForeground("muted"),
    accent: withForeground("accent"),
    popover: withForeground("popover"),
    card: withForeground("card"),
  },
  borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
  fontFamily: {
    sans: "var(--font-interface)",
    mono: "var(--font-monospace)",
  },
  // wind3 stores animation data under { keyframes, durations, timingFns }, not Tailwind's animation/keyframes split.
  animation: {
    keyframes: {
      "accordion-down": "{from{height:0}to{height:var(--radix-accordion-content-height)}}",
      "accordion-up": "{from{height:var(--radix-accordion-content-height)}to{height:0}}",
    },
    durations: { "accordion-down": "0.2s", "accordion-up": "0.2s" },
    timingFns: { "accordion-down": "ease-out", "accordion-up": "ease-out" },
  },
};

export const unoShortcuts: UserShortcuts<Theme> = {};

export const unoRules: Rule<Theme>[] = [[/^transition-\[padding-left\]$/, () => ({ "transition-property": "padding-left" })]];
