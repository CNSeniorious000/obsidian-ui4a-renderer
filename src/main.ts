import { Plugin } from "obsidian";
import { registerCodeblockProcessor } from "./codeblock-processor";
import { refreshStyles } from "./styling";
import { syncTheme, initThemeBridge } from "./theme";

const DEFAULT_SETTINGS = {
  appendCallout: true,
};

export default class UI4ARendererPlugin extends Plugin {
  settings = DEFAULT_SETTINGS;
  private styleObserver: MutationObserver | null = null;

  async onload() {
    // Load settings.
    const saved = (await this.loadData()) as Partial<typeof DEFAULT_SETTINGS> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...saved };

    // Inject styles.
    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/styles.css`);
    document.head.appendChild(styleLink);

    // Register the ```ui4a codeblock processor.
    registerCodeblockProcessor(this);

    // Refresh UnoCSS styles whenever a widget's DOM changes (React re-renders
    // can emit new utility classes after the initial paint).
    this.styleObserver = new MutationObserver(() => {
      void refreshStyles();
    });
    this.styleObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
    });

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
    setTimeout(() => void refreshStyles(), 500);
  }

  onunload() {
    this.styleObserver?.disconnect();
    this.styleObserver = null;
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
