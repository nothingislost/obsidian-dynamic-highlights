import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { debounce, Debouncer, editorInfoField, MarkdownFileInfo } from "obsidian";
import { SearchCursor } from "@codemirror/search";
import { combineConfig, Compartment, Extension, Facet } from "@codemirror/state";
import { SearchHighlightQueries } from "../settings/settings";
import { cloneDeep } from "lodash";

export interface SearchColorOption {
    queryStr: string;
    colorStr: string;
}

export type SearchHighlightOptions = {
    highlightDelay: number;
    highlightQuery: SearchHighlightQueries;
};

const defaultSearchOptions: SearchHighlightOptions = {
    highlightQuery: {},
    highlightDelay: 0,
};

export const SearchHighlightConfig = Facet.define<SearchHighlightOptions, Required<SearchHighlightOptions>>({
    combine(options: readonly SearchHighlightOptions[]) {
        return combineConfig(options, defaultSearchOptions, {
            highlightDelay: Math.min,
            highlightQuery: (a, b) => b
        });
    },
});

export const SearchCompartment = new Compartment();

export function highlightSearchMatches(options?: SearchHighlightOptions): Extension {
    let ext: Extension[] = [searchHighlighter];
    if (options) {
        ext.push(SearchCompartment.of(SearchHighlightConfig.of(cloneDeep(options))));
    }
    return ext;
}

export function reconfigureSearchHighlighter(options: SearchHighlightOptions) {
    return SearchCompartment.reconfigure(SearchHighlightConfig.of(cloneDeep(options)));
}


const searchHighlighter = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;
        highlightDelay: number;
        delayedGetDeco: Debouncer<[view: EditorView]>;

        constructor(view: EditorView) {
            this.updateDebouncer(view);
            this.decorations = this.getDeco(view);
        }

        update(update: ViewUpdate) {
            let reconfigured = JSON.stringify(update.startState.facet(SearchHighlightConfig).highlightQuery) !== JSON.stringify(update.state.facet(SearchHighlightConfig).highlightQuery);
            if (update.docChanged || update.viewportChanged || reconfigured) {
                this.delayedGetDeco(update.view);
            }
        }

        updateDebouncer(view: EditorView) {
            this.highlightDelay = view.state.facet(SearchHighlightConfig).highlightDelay;
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
            let conf = view.state.facet(SearchHighlightConfig);
            const {state} = view;
            let fileInfo: MarkdownFileInfo = view.state.field(editorInfoField);
            if (this.highlightDelay != conf.highlightDelay) this.updateDebouncer(view);
            if (!fileInfo.file) return Decoration.none;

            let queries = conf.highlightQuery[fileInfo.file?.path];

            let deco = [];
            for (let part of view.visibleRanges) {
                for (let i = 0; i < queries.length; i++) {
                    let query = queries[i];
                    let caseInsensitive = (s: string) => s.toLowerCase();
                    let cursor = new SearchCursor(state.doc, query.queryStr, part.from, part.to, caseInsensitive);
                    while (!cursor.next().done) {
                        let {from, to} = cursor.value;
                        const mainMatchDeco = Decoration.mark({
                            class: `cm-search-target`,
                            attributes: {
                                style: `background-color: ${query.colorStr};`,
                            },
                        });
                        deco.push(mainMatchDeco.range(from, to));
                    }
                }
            }
            return Decoration.set(deco.sort(
                (a, b) => a.from - b.from || a.to - b.to
            ));
        }
    },
    {
        decorations: v => v.decorations,
    }
);
