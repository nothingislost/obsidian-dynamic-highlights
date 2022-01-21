// Adapted from https://github.com/mgmeyers/obsidian-style-setting

import { App, Modal, Setting, TextAreaComponent } from "obsidian";
import DynamicHighlightsPlugin from "../main";
import { SearchQueries } from "./settings";


export class ExportModal extends Modal {
  plugin: DynamicHighlightsPlugin;
  section: string;
  config: SearchQueries;

  constructor(app: App, plugin: DynamicHighlightsPlugin, section: string, config: SearchQueries) {
    super(app);
    this.plugin = plugin;
    this.config = config;
    this.section = section;
  }

  onOpen() {
    let { contentEl, modalEl } = this;

    modalEl.addClass("modal-style-settings");
    modalEl.addClass("modal-dynamic-highlights");
    

    new Setting(contentEl).setName(`Export settings for: ${this.section}`).then(setting => {
      const output = JSON.stringify(this.config, null, 2);

      // Build a copy to clipboard link
      setting.controlEl.createEl(
        "a",
        {
          cls: "style-settings-copy",
          text: "Copy to clipboard",
          href: "#",
        },
        copyButton => {
          new TextAreaComponent(contentEl).setValue(output).then(textarea => {
            copyButton.addEventListener("click", e => {
              e.preventDefault();

              // Select the textarea contents and copy them to the clipboard
              textarea.inputEl.select();
              textarea.inputEl.setSelectionRange(0, 99999);
              document.execCommand("copy");

              copyButton.addClass("success");

              setTimeout(() => {
                // If the button is still in the dom, remove the success class
                if (copyButton.parentNode) {
                  copyButton.removeClass("success");
                }
              }, 2000);
            });
          });
        }
      );

      // Build a download link
      setting.controlEl.createEl("a", {
        cls: "style-settings-download",
        text: "Download",
        attr: {
          download: "dynamic-highlights.json",
          href: `data:application/json;charset=utf-8,${encodeURIComponent(output)}`,
        },
      });
    });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
