import { Plugin } from "obsidian";

export default class CM6ExamplesPlugin extends Plugin {
  async onload() {
    this.registerEditorExtension(markCurrentWordPlugin());
  }
}

import { Decoration, DecorationSet, EditorView, MatchDecorator, ViewPlugin, ViewUpdate } from "@codemirror/view";

function markCurrentWordPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      decorator: MatchDecorator;

      constructor(public view: EditorView) {
        this.decorator = this.makeDecorator(view);
        if (this.decorator) {
          this.decorations = this.decorator?.createDeco(this.view);
        } else {
          this.decorations = Decoration.none;
        }
      }

      makeDecorator(view: EditorView) {
        let word = view.state.wordAt(view.state.selection.main.from);
        let wordText = word && view.state.doc.sliceString(word.from, word.to);
        if (!wordText || wordText.length < 3) return;
        return new MatchDecorator({
          regexp: new RegExp(wordText, "g"),
          decoration: () => {
            return Decoration.mark({ class: "cm-current-word" });
          },
        });
      }

      update(update: ViewUpdate) {
        // this is overkill to try and get the regex to update to 
        // search for the current word under the cursor at all times
        this.decorator = this.makeDecorator(this.view);
        if (this.decorator) {
          this.decorations = this.decorator?.createDeco(this.view);
        } else {
          this.decorations = Decoration.none;
        }
      }
    },
    {
      decorations: v => v.decorations,
    }
  );
}
