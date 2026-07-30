import { Plugin } from "obsidian";
import { registerCodeblockProcessor } from "./codeblock-processor";
import { refreshStyles, removeRuntimeStyles } from "./styling";
import { syncTheme, initThemeBridge } from "./theme";

const DEFAULT_SETTINGS = {
  appendCallout: true,
};

export default class UI4ARendererPlugin extends Plugin {
  settings = DEFAULT_SETTINGS;

  async onload() {
    // Load settings.
    const saved = (await this.loadData()) as Partial<typeof DEFAULT_SETTINGS> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...saved };

    // Inject styles.
    const stylesheetLink = document.createElement("link");
    stylesheetLink.rel = "stylesheet";
    stylesheetLink.href = this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/styles.css`);
    document.head.appendChild(stylesheetLink);
    this.register(() => stylesheetLink.remove());
    this.register(removeRuntimeStyles);

    // Register the ```ui4a codeblock processor.
    registerCodeblockProcessor(this);

    // Bidirectional theme bridge: widgets read globalThis.__ui4a_theme and
    // subscribe via __ui4a_on_theme(cb) (host → widget), and can request a
    // switch via __ui4a_set_theme("dark" | "light" | "system") (widget → host),
    // which we route into Obsidian's own theme setting. Updated on theme change
    // via multiple signals (css-change is not always fired).
    initThemeBridge((pref) => {
      // vault.setConfig is the same internal API the appearance settings use;
      // "obsidian"/"moonstone" are Obsidian's built-in dark/light scheme ids.
      (this.app.vault as unknown as { setConfig: (key: string, value: string) => void })
        .setConfig("theme", pref === "dark" ? "obsidian" : pref === "light" ? "moonstone" : "system");
    });
    syncTheme();
    this.registerEvent(this.app.workspace.on("css-change", syncTheme));
    // Belt-and-suspenders: the theme <body> class changes before css-change fires
    // sometimes; observe it directly so widgets never see a stale value.
    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    this.register(() => themeObserver.disconnect());

    // Initial style pass after the first render cycle.
    this.registerEvent(
      this.app.workspace.on("layout-change", () => void refreshStyles())
    );
    const initialStyleRefresh = window.setTimeout(() => void refreshStyles(), 500);
    this.register(() => window.clearTimeout(initialStyleRefresh));
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
