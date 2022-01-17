// originally from: https://github.com/codemirror/search/blob/main/src/selection-match.ts
import { RegExpCursor, SearchCursor } from "@codemirror/search";
import { combineConfig, Compartment, Extension, Facet } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, PluginField, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { cloneDeep } from "lodash";
import DynamicHighlightsPlugin from "src/main";
import { SearchQueries } from "src/settings/settings";
import { StyleSpec } from "style-mod";

export type StaticHighlightOptions = {
  queries: SearchQueries;
  queryOrder: string[];
};

const defaultOptions: StaticHighlightOptions = {
  queries: {},
  queryOrder: [],
};

export const staticHighlightConfig = Facet.define<StaticHighlightOptions, Required<StaticHighlightOptions>>({
  combine(options: readonly StaticHighlightOptions[]) {
    return combineConfig(options, defaultOptions, {
      queries: (a, b) => a || b,
      queryOrder: (a, b) => a || b,
    });
  },
});

const staticHighlighterCompartment = new Compartment();

export function staticHighlighterExtension(plugin: DynamicHighlightsPlugin): Extension {
  let ext: Extension[] = [staticHighlighter];
  let options = plugin.settings.staticHighlighter;
  ext.push(staticHighlightConfig.of(cloneDeep(options)));
  return ext;
}

export interface Styles {
  [selector: string]: StyleSpec;
}

export function buildStyles(plugin: DynamicHighlightsPlugin) {
  let queries = Object.values(plugin.settings.staticHighlighter.queries);
  let styles: Styles = {};
  for (let query of queries) {
    let className = "." + query.class;
    styles[className] = { backgroundColor: query.color };
  }
  let theme = EditorView.theme(styles);
  return theme;
}

const staticHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    lineDecorations: DecorationSet;

    constructor(view: EditorView) {
      let { token, line } = this.getDeco(view);
      this.decorations = token;
      this.lineDecorations = line;
    }

    update(update: ViewUpdate) {
      let reconfigured = update.startState.facet(staticHighlightConfig) !== update.state.facet(staticHighlightConfig);
      if (update.docChanged || update.viewportChanged || reconfigured) {
        let { token, line } = this.getDeco(update.view);
        this.decorations = token;
        this.lineDecorations = line;
      }
    }

    getDeco(view: EditorView): { line: DecorationSet; token: DecorationSet } {
      let { state } = view,
        sel = state.selection;
      let tokenDecos = [];
      // let lineDecos = [];
      let lineClasses: { [key: number]: string[] } = {};
      let queries = Object.values(view.state.facet(staticHighlightConfig).queries);
      for (let part of view.visibleRanges) {
        for (let query of queries) {
          let cursor: RegExpCursor | SearchCursor;
          if (query.regex) cursor = new RegExpCursor(state.doc, query.query, {}, part.from, part.to);
          else cursor = new SearchCursor(state.doc, query.query, part.from, part.to);
          while (!cursor.next().done) {
            let { from, to } = cursor.value;
            let string = state.sliceDoc(from, to).trim();
            const linePos = view.lineBlockAt(from)?.from;
            if (!lineClasses[linePos]) lineClasses[linePos] = [];
            lineClasses[linePos].push(query.class);
            const markDeco = Decoration.mark({ class: query.class, attributes: { "data-contents": string } });
            tokenDecos.push(markDeco.range(from, to));
          }
        }
      }
      Object.entries(lineClasses).forEach(([pos, classes]) => {
        const lineDeco = Decoration.line({ class: classes.join(" ") });
        // lineDecos.push(lineDeco.range(pos));
      });
      return {
        // line: Decoration.set(lineDecos.sort((a, b) => a.from - b.from)),
        line: Decoration.none,
        token: Decoration.set(tokenDecos.sort((a, b) => a.from - b.from)),
      };
    }
  },
  {
    decorations: v => v.decorations,
    // provide: [
    // PluginField.decorations.from(plugin => plugin.decorations),
    // PluginField.decorations.from(plugin => plugin.lineDecorations),
    // ],
  }
);
