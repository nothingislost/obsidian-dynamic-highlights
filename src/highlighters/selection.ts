// originally from: https://github.com/codemirror/search/blob/main/src/selection-match.ts
import { SearchCursor } from "@codemirror/search";
import { CharCategory, combineConfig, Compartment, Extension, Facet } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { cloneDeep } from "lodash";
import { debounce, Debouncer } from "obsidian";
import { ignoredWords } from "src/settings/ignoredWords";

export type SelectionHighlightOptions = {
  /// Determines whether, when nothing is selected, the word around
  /// the cursor is matched instead. Defaults to false.
  highlightWordAroundCursor: boolean;
  highlightSelectedText: boolean;
  /// The minimum length of the selection before it is highlighted.
  /// Defaults to 1 (always highlight non-cursor selections).
  minSelectionLength: number;
  /// The amount of matches (in the viewport) at which to disable
  /// highlighting. Defaults to 100.
  maxMatches: number;
  ignoredWords: string;
  highlightDelay: number;
};

const defaultHighlightOptions: SelectionHighlightOptions = {
  highlightWordAroundCursor: true,
  highlightSelectedText: true,
  minSelectionLength: 3,
  maxMatches: 100,
  ignoredWords: ignoredWords,
  highlightDelay: 0,
};

export const highlightConfig = Facet.define<SelectionHighlightOptions, Required<SelectionHighlightOptions>>({
  combine(options: readonly SelectionHighlightOptions[]) {
    return combineConfig(options, defaultHighlightOptions, {
      highlightWordAroundCursor: (a, b) => a || b,
      minSelectionLength: Math.min,
      maxMatches: Math.min,
      highlightDelay: Math.min,
      ignoredWords: (a, b) => a || b,
    });
  },
});

export const highlightCompartment = new Compartment();

export function highlightSelectionMatches(options?: SelectionHighlightOptions): Extension {
  let ext: Extension[] = [matchHighlighter];
  if (options) {
    ext.push(highlightCompartment.of(highlightConfig.of(cloneDeep(options))));
  }
  return ext;
}

export function reconfigureSelectionHighlighter(options: SelectionHighlightOptions) {
  return highlightCompartment.reconfigure(highlightConfig.of(cloneDeep(options)));
}

const matchHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    highlightDelay: number;
    delayedGetDeco: Debouncer<[view: EditorView]>;

    constructor(view: EditorView) {
      this.updateDebouncer(view);
      this.decorations = this.getDeco(view);
    }

    update(update: ViewUpdate) {
      if (update.selectionSet || update.docChanged || update.viewportChanged) {
        this.decorations = Decoration.none;
        this.delayedGetDeco(update.view);
      }
    }

    updateDebouncer(view: EditorView) {
      this.highlightDelay = view.state.facet(highlightConfig).highlightDelay;
      this.delayedGetDeco = debounce(
        (view: EditorView) => {
          this.decorations = this.getDeco(view);
          view.update([]); // force a view update so that the decorations we just set get applied
        },
        this.highlightDelay,
        true
      );
    }

    getDeco(view: EditorView): DecorationSet {
      let conf = view.state.facet(highlightConfig);
      if (this.highlightDelay != conf.highlightDelay) this.updateDebouncer(view);
      let { state } = view,
        sel = state.selection;
      if (sel.ranges.length > 1) return Decoration.none;
      let range = sel.main,
        query,
        check = null,
        matchType: string;
      if (range.empty) {
        matchType = "word";
        if (!conf.highlightWordAroundCursor) return Decoration.none;
        let word = state.wordAt(range.head);
        if (!word) return Decoration.none;
        if (word) check = state.charCategorizer(range.head);
        query = state.sliceDoc(word.from, word.to);
        let ignoredWords = new Set(conf.ignoredWords.split(",").map(w => w.toLowerCase().trim()));
        if (ignoredWords.has(query.toLowerCase()) || query.length < conf.minSelectionLength) return Decoration.none;
      } else {
        matchType = "string";
        if (!conf.highlightSelectedText) return Decoration.none;
        let len = range.to - range.from;
        if (len < conf.minSelectionLength || len > 200) return Decoration.none;
        query = state.sliceDoc(range.from, range.to).trim();
        if (!query) return Decoration.none;
      }
      let deco = [];
      for (let part of view.visibleRanges) {
        let caseInsensitive = (s: string) => s.toLowerCase();
        let cursor = new SearchCursor(state.doc, query, part.from, part.to, caseInsensitive);
        while (!cursor.next().done) {
          let { from, to } = cursor.value;
          if (
            !check ||
            ((from == 0 || check(state.sliceDoc(from - 1, from)) != CharCategory.Word) &&
              (to == state.doc.length || check(state.sliceDoc(to, to + 1)) != CharCategory.Word))
          ) {
            let string = state.sliceDoc(from, to).trim();
            if (check && from <= range.from && to >= range.to) {
              const mainMatchDeco = Decoration.mark({
                class: `cm-current-${matchType}`,
                attributes: { "data-contents": string },
              });
              deco.push(mainMatchDeco.range(from, to));
            } else if (from >= range.to || to <= range.from) {
              const matchDeco = Decoration.mark({
                class: `cm-matched-${matchType}`,
                attributes: { "data-contents": string },
              });
              deco.push(matchDeco.range(from, to));
            }
            if (deco.length > conf.maxMatches) return Decoration.none;
          }
        }
      }
      if (deco.length < (range.empty ? 2 : 1)) {
        return Decoration.none;
      }
      return Decoration.set(deco);
    }
  },
  {
    decorations: v => v.decorations,
  }
);
