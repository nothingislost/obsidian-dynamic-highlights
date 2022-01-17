import Pickr from "@simonwep/pickr";
import { App, ButtonComponent, Notice, PluginSettingTab, setIcon, Setting, TextComponent, ToggleComponent } from "obsidian";
import Sortable from "sortablejs";
import DynamicHighlightsPlugin from "../main";
import { setAttributes } from "./settings";

export class SettingTab extends PluginSettingTab {
  plugin: DynamicHighlightsPlugin;

  constructor(app: App, plugin: DynamicHighlightsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.addClass("dynamic-highlights-settings");

    containerEl.createEl("h3", {
      text: "Persistent Highlights",
    });
    const settingsUI = new Setting(containerEl);
    const config = this.plugin.settings.staticHighlighter;

    settingsUI
      .setName("Define persistent highlighters")
      .setClass("highlighterplugin-setting-item")
      .setDesc(
        `In this section you define a unique class name along with a highlight color and a search term/expression. Enable the regex toggle when entering a regex query. Make sure to click the save button once you're done defining the highlighter.`
      );

    const classInput = new TextComponent(settingsUI.controlEl);
    classInput.setPlaceholder("Highlighter name");
    classInput.inputEl.ariaLabel = "Highlighter name"
    classInput.inputEl.addClass("highlighter-settings-color");

    const colorWrapper = settingsUI.controlEl.createDiv("color-wrapper");

    const hexInput = new TextComponent(colorWrapper);
    hexInput.setPlaceholder("BG Color");
    hexInput.inputEl.ariaLabel = "Background color value"
    hexInput.inputEl.addClass("highlighter-settings-value");

    const colorPicker = new ButtonComponent(colorWrapper);
    colorPicker.setClass("highlightr-color-picker")
      .then(() => {
        let input = hexInput.inputEl;
        let currentColor = hexInput.inputEl.value || null;

        const colorMap = config.queryOrder.map(highlightKey => config.queries[highlightKey].color);

        let colorHex;
        let pickrCreate = new Pickr({
          el: colorPicker.buttonEl,
          container: colorWrapper,
          theme: "nano",
          swatches: colorMap,
          defaultRepresentation: "HEXA",
          default: "#42188038",
          comparison: false,
          components: {
            preview: true,
            opacity: true,
            hue: true,
            interaction: {
              hex: true,
              rgba: true,
              hsla: true,
              hsva: false,
              cmyk: false,
              input: true,
              clear: false,
              cancel: true,
              save: true,
            },
          },
        });
        colorWrapper.querySelector('.pcr-button').ariaLabel = "Background color picker";

        pickrCreate
          .on("clear", function (instance: Pickr) {
            instance.hide();
            input.trigger("change");
          })
          .on("cancel", function (instance: Pickr) {
            currentColor = instance.getSelectedColor().toHEXA().toString();

            input.trigger("change");
            instance.hide();
          })
          .on("change", function (color: Pickr.HSVaColor) {
            colorHex = color.toHEXA().toString();
            let newColor;
            colorHex.length == 6
              ? (newColor = `${color.toHEXA().toString()}A6`)
              : (newColor = color.toHEXA().toString());
            classInput.inputEl.setAttribute("style", `background-color: ${newColor}; color: var(--text-normal);`);

            setAttributes(input, {
              value: newColor,
              style: `background-color: ${newColor}; color: var(--text-normal);`,
            });
            input.setText(newColor);
            input.textContent = newColor;
            input.value = newColor;
            input.trigger("change");
          })
          .on("save", function (color: Pickr.HSVaColor, instance: Pickr) {
            let newColorValue = color.toHEXA().toString();

            input.setText(newColorValue);
            input.textContent = newColorValue;
            input.value = newColorValue;
            input.trigger("change");

            instance.hide();
            instance.addSwatch(color.toHEXA().toString());
          });
      });

    const queryWrapper = settingsUI.controlEl.createDiv("query-wrapper");
    const queryInput = new TextComponent(queryWrapper);
    queryInput.setPlaceholder("Search term");
    queryInput.inputEl.addClass("highlighter-settings-query");

    const queryTypeInput = new ToggleComponent(queryWrapper);
    queryTypeInput.toggleEl.addClass("highlighter-settings-regex");
    queryTypeInput.toggleEl.ariaLabel = "Enable Regex";
    queryTypeInput.onChange(value => {
      if (value) queryInput.setPlaceholder("Search expression");
      else queryInput.setPlaceholder("Search term");
    })

    const saveButton = new ButtonComponent(queryWrapper);
    saveButton
      .setClass("action-button")
      .setClass("action-button-add")
      .setIcon("highlightr-save")
      .setTooltip("Save")
      .onClick(async (buttonEl: any) => {
        let className = classInput.inputEl.value.replace(/ /g, "-");
        let hexValue = hexInput.inputEl.value;
        let queryValue = queryInput.inputEl.value;
        let queryTypeValue = queryTypeInput.toggleEl.hasClass("is-enabled");

        if (className && hexValue) {
          if (!config.queryOrder.includes(className)) {
            config.queryOrder.push(className);
            config.queries[className] = {
              class: className,
              color: hexValue,
              regex: queryTypeValue,
              query: queryValue,
            };
            await this.plugin.saveSettings();
            this.plugin.updateStaticHighlighter();
            this.plugin.updateStyles();
            this.display();
          } else {
            buttonEl.stopImmediatePropagation();
            new Notice("This highlighter already exists");
          }
        } else if (className && !hexValue) {
          new Notice("Highlighter hex code missing");
        } else if (!className && hexValue) {
          new Notice("Highlighter name missing");
        } else if (!/^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/.test(className)) {
          new Notice("Highlighter name missing");
        } else {
          new Notice("Highlighter values missing");
        }
      });

    const highlightersContainer = containerEl.createEl("div", {
      cls: "highlighter-container",
    });

    Sortable.create(highlightersContainer, {
      animation: 500,
      ghostClass: "highlighter-sortable-ghost",
      chosenClass: "highlighter-sortable-chosen",
      dragClass: "highlighter-sortable-drag",
      dragoverBubble: true,
      forceFallback: true,
      fallbackClass: "highlighter-sortable-fallback",
      easing: "cubic-bezier(1, 0, 0, 1)",
      onSort: command => {
        const arrayResult = config.queryOrder;
        const [removed] = arrayResult.splice(command.oldIndex, 1);
        arrayResult.splice(command.newIndex, 0, removed);
        this.plugin.settings.staticHighlighter.queryOrder = arrayResult;
        this.plugin.saveSettings();
      },
    });

    this.plugin.settings.staticHighlighter.queryOrder.forEach(highlighter => {
      const { color, query, regex } = config.queries[highlighter];
      const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill=${color} stroke=${color} stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M20.707 5.826l-3.535-3.533a.999.999 0 0 0-1.408-.006L7.096 10.82a1.01 1.01 0 0 0-.273.488l-1.024 4.437L4 18h2.828l1.142-1.129l3.588-.828c.18-.042.345-.133.477-.262l8.667-8.535a1 1 0 0 0 .005-1.42zm-9.369 7.833l-2.121-2.12l7.243-7.131l2.12 2.12l-7.242 7.131zM4 20h16v2H4z"/></svg>`;
      const settingItem = highlightersContainer.createEl("div");
      settingItem.addClass("highlighter-item-draggable");
      const dragIcon = settingItem.createEl("span");
      const colorIcon = settingItem.createEl("span");
      dragIcon.addClass("highlighter-setting-icon");
      colorIcon.addClass("highlighter-setting-icon");
      colorIcon.innerHTML = icon;
      setIcon(dragIcon, "three-horizontal-bars");
      dragIcon.ariaLabel = "Drag to rearrange"
      

      new Setting(settingItem) 
        .setClass("highlighterplugin-setting-item")
        .setName(highlighter)
        .setDesc((regex ? "search term: " : "search expression: ") + query)
        .addButton(button => {
          button
            .setClass("action-button")
            .setClass("action-button-delete")
            .setIcon("highlightr-delete")
            .setTooltip("Remove")
            .onClick(async () => {
              new Notice(`${highlighter} highlight deleted`);
              delete config.queries[highlighter];
              config.queryOrder.remove(highlighter);
              await this.plugin.saveSettings();
              this.plugin.updateStyles();
              this.plugin.updateStaticHighlighter();
              this.display();
            });
        });
    });

    containerEl.createEl("h3", {
      text: "Selection Highlights",
    });
    new Setting(containerEl).setName("Highlight all occurrences of the word under the cursor").addToggle(toggle => {
      toggle.setValue(this.plugin.settings.selectionHighlighter.highlightWordAroundCursor).onChange(value => {
        this.plugin.settings.selectionHighlighter.highlightWordAroundCursor = value;
        this.plugin.saveSettings();
        this.plugin.updateConfig("selection", this.plugin.settings.selectionHighlighter);
      });
    });
    new Setting(containerEl).setName("Highlight all occurrences of the actively selected text").addToggle(toggle => {
      toggle.setValue(this.plugin.settings.selectionHighlighter.highlightSelectedText).onChange(value => {
        this.plugin.settings.selectionHighlighter.highlightSelectedText = value;
        this.plugin.saveSettings();
        this.plugin.updateConfig("selection", this.plugin.settings.selectionHighlighter);
      });
    });
    new Setting(containerEl)
      .setName("Highlight delay")
      .setDesc("The delay, in milliseconds, before selection highlights will appear")
      .addText(text => {
        text.inputEl.type = "number";
        text.setValue(String(this.plugin.settings.selectionHighlighter.highlightDelay)).onChange(value => {
          if (parseInt(value) >= 0) this.plugin.settings.selectionHighlighter.highlightDelay = parseInt(value);
          this.plugin.saveSettings();
          this.plugin.updateConfig("selection", this.plugin.settings.selectionHighlighter);
        });
      });
    new Setting(containerEl)
      .setName("Ignored words")
      .setDesc("A comma delimted list of words that will not be highlighted")
      .addTextArea(text => {
        text.inputEl.addClass("ignored-words-input");
        text.setValue(this.plugin.settings.selectionHighlighter.ignoredWords).onChange(async value => {
          this.plugin.settings.selectionHighlighter.ignoredWords = value;
          await this.plugin.saveSettings();
          this.plugin.updateConfig("selection", this.plugin.settings.selectionHighlighter);
        });
      });
  }
}
