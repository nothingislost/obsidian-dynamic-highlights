// Adapted from https://github.com/mgmeyers/obsidian-style-setting

import Ajv from "ajv";
import { App, ButtonComponent, Modal, Setting, TextAreaComponent } from "obsidian";
import { queriesSchema } from "src/schema/queries";
import DynamicHighlightsPlugin from "../main";
import { SearchQueries } from "./settings";

export class ImportModal extends Modal {
  plugin: DynamicHighlightsPlugin;

  constructor(app: App, plugin: DynamicHighlightsPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    let { contentEl, modalEl } = this;

    modalEl.addClass("modal-style-settings");
    modalEl.addClass("modal-dynamic-highlights");

    new Setting(contentEl)
      .setName("Import highlighters")
      .setDesc("Import an entire or partial configuration. Warning: this may override existing highlighters");

    new Setting(contentEl).then(setting => {
      // Build an error message container
      const errorSpan = createSpan({
        cls: "style-settings-import-error",
        text: "Error importing config",
      });

      setting.nameEl.appendChild(errorSpan);

      // Attempt to parse the imported data and close if successful
      const importAndClose = async (str: string) => {
        if (str) {
          try {
            let { queries, queryOrder } = this.plugin.settings.staticHighlighter;
            const importedSettings = JSON.parse(str) as SearchQueries;
            const ajv = new Ajv();
            const validate = ajv.compile(queriesSchema);
            if (!validate(importedSettings)) {
              throw validate.errors?.map(err => `${err.instancePath} ${err.message}`).first();
            }
            queries = Object.assign(queries, importedSettings);
            Object.keys(importedSettings).forEach(key => queryOrder.includes(key) || queryOrder.push(key));
            await this.plugin.saveSettings();
            this.plugin.updateStaticHighlighter();
            this.plugin.updateStyles();
            this.plugin.updateCustomCSS();
            this.plugin.settingsTab.display();
            this.close();
          } catch (e) {
            errorSpan.addClass("active");
            errorSpan.setText(`Error importing highlighters: ${e}`);
          }
        } else {
          errorSpan.addClass("active");
          errorSpan.setText(`Error importing highlighters: config is empty`);
        }
      };

      // Build a file input
      setting.controlEl.createEl(
        "input",
        {
          cls: "style-settings-import-input",
          attr: {
            id: "style-settings-import-input",
            name: "style-settings-import-input",
            type: "file",
            accept: ".json",
          },
        },
        importInput => {
          // Set up a FileReader so we can parse the file contents
          importInput.addEventListener("change", e => {
            const reader = new FileReader();
            reader.onload = async (e: ProgressEvent<FileReader>) => {
              if (e.target?.result) {
                await importAndClose(e.target && e.target.result.toString().trim());
              }
            };
            let files = (e.target as HTMLInputElement).files;
            if (files?.length) reader.readAsText(files[0]);
          });
        }
      );

      // Build a label we will style as a link
      setting.controlEl.createEl("label", {
        cls: "style-settings-import-label",
        text: "Import from file",
        attr: {
          for: "style-settings-import-input",
        },
      });

      new TextAreaComponent(contentEl).setPlaceholder("Paste config here...").then(ta => {
        new ButtonComponent(contentEl).setButtonText("Save").onClick(async () => {
          await importAndClose(ta.getValue().trim());
        });
      });
    });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
