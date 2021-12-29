import { App, debounce, Debouncer, Plugin, PluginSettingTab, Setting } from "obsidian";
import { Decoration, DecorationSet, EditorView, MatchDecorator, ViewPlugin, ViewUpdate } from "@codemirror/view";
import XRegExp from "xregexp";

interface SearchConfig {
  value: string;
  type: string;
  range: { from: number; to: number };
}

interface HighlightCurrentTextSettings {
  delay: number;
  ignoreWords: string;
}

const DEFAULT_SETTINGS: HighlightCurrentTextSettings = {
  delay: 0,
  ignoreWords:
    "myself, our, ours, ourselves, you, your, yours, yourself, yourselves, him, his, himself, she, her, hers, herself, its, itself, they, them, their, theirs, themselves, what, which, who, whom, this, that, these, those, are, was, were, been, being, have, has, had, having, does, did, doing, the, and, but, because, until, while, for, with, about, against, between, into, through, during, before, after, above, below, from, down, out, off, over, under, again, further, then, once, here, there, when, where, why, how, all, any, both, each, few, more, most, other, some, such, nor, not, only, own, same, than, too, very, can, will, just, don, should,now",
};

export default class HighlightCurrentTextPlugin extends Plugin {
  settings: HighlightCurrentTextSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));
    // see https://github.com/slevithan/xregexp/issues/228#issuecomment-811478498
    XRegExp.addToken(/\\b/, () => String.raw`(?:(?<=\p{L}\p{M}*)(?!\p{L}\p{M}*)|(?<!\p{L}\p{M}*)(?=\p{L}\p{M}*))`, {
      flag: "A",
    });
    this.registerEditorExtension(markCurrentWordPlugin(this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

function markCurrentWordPlugin(plugin: HighlightCurrentTextPlugin) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      decorator: MatchDecorator;
      delayedUpdate: Debouncer<[update: ViewUpdate, search: SearchConfig]>;
      delay: number;

      constructor(public view: EditorView) {
        let search = this.getSearch(view);
        if (!search || search.value.length < 3) {
          this.decorations = Decoration.none;
          return;
        }
        this.delay = this.updateDelay();
        this.decorator = this.makeDecorator(view, search);
        if (this.decorator) {
          this.decorations = this.decorator?.createDeco(this.view);
        } else {
          this.decorations = Decoration.none;
        }
      }

      escapeRegExp(string: string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
      }

      makeDecorator(view: EditorView, search: SearchConfig) {
        return new MatchDecorator({
          regexp:
            search.type === "word"
              ? XRegExp("\\b" + this.escapeRegExp(search.value) + "\\b", "Augi")
              : RegExp(this.escapeRegExp(search.value), "gi"),
          decoration: () => {
            return Decoration.mark({
              class: `cm-matched-${search.type}`,
              attributes: { [`data-current-${search.type}`]: search.value },
            });
          },
        });
      }

      getSearch(view: EditorView): SearchConfig {
        let searchString: string, from: number, to: number;
        let selection = view.state.selection.main;
        let word = view.state.wordAt(selection.from);
        if (!selection.empty) {
          // if there's selected text, highlight that instead
          (from = selection.from), (to = selection.to);
          searchString = view.state.doc.sliceString(selection.from, selection.to);
        } else {
          if (!word) return null;
          (from = word.from), (to = word.to);
          // otherwise, highlight the current word under the cursor
          searchString = word && view.state.doc.sliceString(word.from, word.to);
        }
        let ignoreWords = new Set(plugin.settings.ignoreWords.split(",").map(w => w.trim()));
        if (ignoreWords.has(searchString)) return null;
        return { value: searchString, type: selection.empty ? "word" : "string", range: { from, to } };
      }

      applyHighlight = (update: ViewUpdate, search: SearchConfig) => {
        let deco = this.decorator.createDeco(this.view);
        if (deco.size < 2) {
          // if there's no matches, don't highlight the current text
          this.decorations = Decoration.none;
        } else {
          this.decorations = deco.update({
            // remove the decorations applied to the text under the cursor
            filter: (from, to) => from !== search.range.from && to !== search.range.to,
            // and add a 'current' marker
            add: [Decoration.mark({ class: `cm-current-${search.type}` }).range(search.range.from, search.range.to)],
          });
        }
        update.view.update([]);
      };

      updateDelay(): number {
        // this exists because we need to keep the value of plugin.settings.delay fresh
        // without this, the delay will be defined once and never updated
        this.delayedUpdate = debounce(this.applyHighlight, plugin.settings.delay, true);
        return plugin.settings.delay;
      }

      update(update: ViewUpdate) {
        if (plugin.settings.delay !== this.delay) {
          this.delay = this.updateDelay();
        }
        // clear the decorations on update
        this.decorations = Decoration.none;
        // build a decorator using the word under the cursor
        let search = this.getSearch(update.view);
        if (!search || search.value.length < 3) {
          this.decorations = Decoration.none;
          return;
        }
        this.decorator = this.makeDecorator(this.view, search);
        // debounce the decoration creation and view update
        this.delayedUpdate(update, search);
      }
    },
    {
      decorations: v => v.decorations,
    }
  );
}

class SettingTab extends PluginSettingTab {
  plugin: HighlightCurrentTextPlugin;

  constructor(app: App, plugin: HighlightCurrentTextPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Highlight Delay")
      .setDesc("The delay, in milliseconds, before highlights will render")
      .addText(text => {
        text.inputEl.type = "number";
        text.setValue(String(this.plugin.settings.delay)).onChange(async value => {
          if (parseInt(value) >= 0) this.plugin.settings.delay = parseInt(value);
          await this.plugin.saveSettings();
        });
      });
    new Setting(containerEl)
      .setName("Ignored words")
      .setDesc("A comma delimted list of words that will not be highlighted")
      .addText(text => {
        text.setValue(this.plugin.settings.ignoreWords).onChange(async value => {
          this.plugin.settings.ignoreWords = value;
          await this.plugin.saveSettings();
        });
      });
  }
}
