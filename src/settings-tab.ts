import { PluginSettingTab, Setting, type App } from "obsidian";
import type UI4ARendererPlugin from "./main";

export class UI4ASettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: UI4ARendererPlugin) {
    super(app, plugin);
  }

  display() {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName("Record interactions in the note")
      .setDesc(
        "When a widget calls sendUserMessage, append a > [!user-intent] callout to the note. " +
          "Turn this off to only show a transient notice and never write to the vault."
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.appendCallout).onChange(async (value) => {
          this.plugin.settings.appendCallout = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
