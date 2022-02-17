import { EditorState, Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import Pickr from "@simonwep/pickr";
import {
  App,
  ButtonComponent,
  Notice,
  PluginSettingTab,
  Scope,
  setIcon,
  Setting,
  TextAreaComponent,
  TextComponent,
  ToggleComponent,
} from "obsidian";
import Sortable from "sortablejs";
import { basicSetup } from "src/editor/extensions";
import DynamicHighlightsPlugin from "../main";
import { ExportModal } from "./export";
import { ImportModal } from "./import";
import { markTypes } from "./settings";
import { materialPalenight } from "codemirror6-themes";

export class SettingTab extends PluginSettingTab {
  plugin: DynamicHighlightsPlugin;
  editor: EditorView;
  scope: Scope;
  pickrInstance: Pickr;

  constructor(app: App, plugin: DynamicHighlightsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    // this.scope = new Scope(app.scope);
  }

  hide() {
    this.editor?.destroy();
    this.pickrInstance && this.pickrInstance.destroyAndRemove();
    // this.app.keymap.popScope(this.scope);
  }

  display(): void {
    // this.app.keymap.pushScope(this.scope);
    const { containerEl } = this;
    containerEl.empty();
    const config = this.plugin.settings.staticHighlighter;
    const importExportEl = containerEl.createDiv("import-export-wrapper");
    importExportEl.createEl(
      "a",
      {
        cls: "dynamic-highlighter-import",
        text: "Import",
        href: "#",
      },
      el => {
        el.addEventListener("click", e => {
          e.preventDefault();
          new ImportModal(this.plugin.app, this.plugin).open();
        });
      }
    );
    importExportEl.createEl(
      "a",
      {
        cls: "dynamic-highlighter-export",
        text: "Export",
        href: "#",
      },
      el => {
        el.addEventListener("click", e => {
          e.preventDefault();
          new ExportModal(this.plugin.app, this.plugin, "All", config.queries).open();
        });
      }
    );
    containerEl
      .createEl("h3", {
        text: "Persistent Highlights",
      })
      .addClass("persistent-highlights");
    containerEl.addClass("dynamic-highlights-settings");

    const defineQueryUI = new Setting(containerEl);

    defineQueryUI
      .setName("Define persistent highlighters")
      .setClass("highlighter-definition")
      .setDesc(
        `In this section you define a unique highlighter name along with a background color and a search term/expression. Enable the regex toggle when entering a regex query. Make sure to click the save button once you're done defining the highlighter.`
      );

    const classInput = new TextComponent(defineQueryUI.controlEl);
    classInput.setPlaceholder("Highlighter name");
    classInput.inputEl.ariaLabel = "Highlighter name";
    classInput.inputEl.addClass("highlighter-name");

    const colorWrapper = defineQueryUI.controlEl.createDiv("color-wrapper");

    let pickrInstance: Pickr;
    const colorPicker = new ButtonComponent(colorWrapper);

    colorPicker.setClass("highlightr-color-picker").then(() => {
      this.pickrInstance = pickrInstance = new Pickr({ 
        el: colorPicker.buttonEl,
        container: colorWrapper,
        theme: "nano",
        defaultRepresentation: "HEXA",
        default: "#42188038",
        comparison: false,
        components: {
          preview: true,
          opacity: true,
          hue: true,
          interaction: {
            hex: true,
            rgba: false,
            hsla: true,
            hsva: false,
            cmyk: false,
            input: true,
            clear: true,
            cancel: true,
            save: true,
          },
        },
      });
      colorWrapper.querySelector(".pcr-button")!.ariaLabel = "Background color picker";

      pickrInstance
        .on("clear", (instance: Pickr) => {
          instance.hide();
          classInput.inputEl.setAttribute("style", `background-color: none; color: var(--text-normal);`);
        })
        .on("cancel", (instance: Pickr) => {
          instance.hide();
        })
        .on("change", (color: Pickr.HSVaColor) => {
          let colorHex = color?.toHEXA().toString() || "";
          let newColor;
          colorHex && colorHex.length == 6 ? (newColor = `${colorHex}A6`) : (newColor = colorHex);
          classInput.inputEl.setAttribute("style", `background-color: ${newColor}; color: var(--text-normal);`);
        })
        .on("save", (color: Pickr.HSVaColor, instance: Pickr) => {
          instance.hide();
        });
    });

    const queryWrapper = defineQueryUI.controlEl.createDiv("query-wrapper");
    const queryInput = new TextComponent(queryWrapper);
    queryInput.setPlaceholder("Search term");
    queryInput.inputEl.addClass("highlighter-settings-query");

    const queryTypeInput = new ToggleComponent(queryWrapper);
    queryTypeInput.toggleEl.addClass("highlighter-settings-regex");
    queryTypeInput.toggleEl.ariaLabel = "Enable Regex";
    queryTypeInput.onChange(value => {
      if (value) {
        queryInput.setPlaceholder("Search expression");
        // groupWrapper.show();
        marks.group?.element.show();
      } else {
        queryInput.setPlaceholder("Search term");
        marks.group?.element.hide();
      }
    });

    type MarkTypes = Record<markTypes, { description: string; defaultState: boolean }>;
    type MarkItems = Partial<Record<markTypes, { element: HTMLElement; component: ToggleComponent }>>;
    const buildMarkerTypes = (parentEl: HTMLElement) => {
      const types: MarkItems = {};
      const marks: MarkTypes = {
        match: { description: "matches", defaultState: true },
        group: { description: "capture groups", defaultState: false },
        line: { description: "parent line", defaultState: false },
        start: { description: "start", defaultState: false },
        end: { description: "end", defaultState: false },
      };
      const container = parentEl.createDiv("mark-wrapper");
      let type: markTypes;
      for (type in marks) {
        let mark = marks[type];
        const wrapper = container.createDiv("mark-wrapper");
        if (type === "group") wrapper.hide();
        wrapper.createSpan("match-type").setText(mark.description);
        const component = new ToggleComponent(wrapper).setValue(mark.defaultState);
        types[type] = {
          element: wrapper,
          component: component,
        };
      }
      return types;
    };
    const marks = buildMarkerTypes(defineQueryUI.controlEl);

    const customCSSWrapper = defineQueryUI.controlEl.createDiv("custom-css-wrapper");
    customCSSWrapper.createSpan("setting-item-name").setText("Custom CSS");
    const customCSSEl = new TextAreaComponent(customCSSWrapper);
    this.editor = editorFromTextArea(customCSSEl.inputEl, basicSetup);
    customCSSEl.inputEl.addClass("custom-css");

    const saveButton = new ButtonComponent(queryWrapper);
    saveButton
      .setClass("action-button")
      .setClass("action-button-save")
      .setClass("mod-cta")
      .setIcon("save")
      .setTooltip("Save")
      .onClick(async (buttonEl: any) => {
        let className = classInput.inputEl.value.replace(/ /g, "-");
        let hexValue = pickrInstance.getSelectedColor()?.toHEXA().toString();
        let queryValue = queryInput.inputEl.value;
        let queryTypeValue = queryTypeInput.getValue();
        let customCss = this.editor.state.doc.toString();

        if (className) {
          if (!config.queryOrder.includes(className)) {
            config.queryOrder.push(className);
          }
          let enabledMarks = Object.entries(marks)
            .map(([type, item]) => item.component.getValue() && type)
            .filter(m => m);
          config.queries[className] = {
            class: className,
            color: hexValue ? hexValue : "",
            regex: queryTypeValue,
            query: queryValue,
            mark: enabledMarks,
            css: customCss,
          };
          await this.plugin.saveSettings();
          this.plugin.updateStaticHighlighter();
          this.plugin.updateCustomCSS();
          this.plugin.updateStyles();
          this.display();
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

    this.plugin.settings.staticHighlighter.queryOrder.forEach(highlighter => {
      const { color, query, regex } = config.queries[highlighter];
      const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill=${color} stroke=${color} stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M20.707 5.826l-3.535-3.533a.999.999 0 0 0-1.408-.006L7.096 10.82a1.01 1.01 0 0 0-.273.488l-1.024 4.437L4 18h2.828l1.142-1.129l3.588-.828c.18-.042.345-.133.477-.262l8.667-8.535a1 1 0 0 0 .005-1.42zm-9.369 7.833l-2.121-2.12l7.243-7.131l2.12 2.12l-7.242 7.131zM4 20h16v2H4z"/></svg>`;
      const settingItem = highlightersContainer.createEl("div");
      settingItem.id = "dh-" + highlighter;
      settingItem.addClass("highlighter-item-draggable");
      const dragIcon = settingItem.createEl("span");
      const colorIcon = settingItem.createEl("span");
      dragIcon.addClass("highlighter-setting-icon", "highlighter-setting-icon-drag");
      colorIcon.addClass("highlighter-setting-icon");
      colorIcon.innerHTML = icon;
      setIcon(dragIcon, "three-horizontal-bars");
      dragIcon.ariaLabel = "Drag to rearrange";
      let desc: string[] = [];
      desc.push((regex ? "search expression: " : "search term: ") + query);
      desc.push("css class: " + highlighter);
      desc.push("color: " + config.queries[highlighter].color);

      new Setting(settingItem)
        .setClass("highlighter-details")
        .setName(highlighter)
        .setDesc(desc.join(" | "))
        .addButton(button => {
          button
            .setClass("action-button")
            .setClass("action-button-edit")
            .setClass("mod-cta")
            .setIcon("pencil")
            .setTooltip("Edit")
            .onClick(async evt => {
              let options = config.queries[highlighter];
              classInput.inputEl.value = highlighter;
              pickrInstance.setColor(options.color);
              queryInput.inputEl.value = options.query;
              pickrInstance.setColor(options.color);
              queryTypeInput.setValue(options.regex);
              let extensions = basicSetup;
              if (document.body.hasClass("theme-dark")) extensions.push(materialPalenight);
              this.editor.setState(EditorState.create({ doc: options.css ? options.css : "", extensions: extensions }));
              if (options?.mark) {
                Object.entries(marks).map(([key, value]) =>
                  options.mark!.includes(key) ? value.component.setValue(true) : value.component.setValue(false)
                );
              } else {
                Object.entries(marks).map(([key, value]) =>
                  key === "match" ? value.component.setValue(true) : value.component.setValue(false)
                );
              }
              containerEl.scrollTop = 0;
            });
        })
        .addButton(button => {
          button
            .setClass("action-button")
            .setClass("action-button-delete")
            .setIcon("trash")
            .setClass("mod-warning")
            .setTooltip("Remove")
            .onClick(async () => {
              new Notice(`${highlighter} highlight deleted`);
              delete config.queries[highlighter];
              config.queryOrder.remove(highlighter);
              await this.plugin.saveSettings();
              this.plugin.updateStyles();
              this.plugin.updateStaticHighlighter();
              highlightersContainer.querySelector(`#dh-${highlighter}`)!.detach();
            });
        });
    });
    let sortableEl = Sortable.create(highlightersContainer, {
      animation: 500,
      ghostClass: "highlighter-sortable-ghost",
      chosenClass: "highlighter-sortable-chosen",
      dragClass: "highlighter-sortable-drag",
      handle: ".highlighter-setting-icon-drag",
      dragoverBubble: true,
      forceFallback: true,
      fallbackClass: "highlighter-sortable-fallback",
      easing: "cubic-bezier(1, 0, 0, 1)",
      onSort: command => {
        const arrayResult = config.queryOrder;
        const [removed] = arrayResult.splice(command.oldIndex!, 1);
        arrayResult.splice(command.newIndex!, 0, removed);
        this.plugin.settings.staticHighlighter.queryOrder = arrayResult;
        this.plugin.saveSettings();
      },
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

function editorFromTextArea(textarea: HTMLTextAreaElement, extensions: Extension) {
  let view = new EditorView({
    state: EditorState.create({ doc: textarea.value, extensions }),
  });
  textarea.parentNode!.insertBefore(view.dom, textarea);
  textarea.style.display = "none";
  if (textarea.form)
    textarea.form.addEventListener("submit", () => {
      textarea.value = view.state.doc.toString();
    });
  return view;
}
