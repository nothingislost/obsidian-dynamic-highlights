import { StaticHighlightOptions } from "src/highlighters/static";
import { SelectionHighlightOptions } from "../highlighters/selection";
import { ignoredWords } from "./ignoredWords";

interface SearchConfig {
  value: string;
  type: string;
  range: { from: number; to: number };
}
export type markTypes = "line" | "match" | "group";
interface SearchQuery {
  query: string;
  class: string;
  color: string;
  regex: boolean;
  mark?: markTypes[];
}
export interface SearchQueries {
  [key: string]: SearchQuery;
}

export type HighlighterOptions = SelectionHighlightOptions | StaticHighlightOptions;

export interface DynamicHighlightsSettings {
  selectionHighlighter: SelectionHighlightOptions;
  staticHighlighter: StaticHighlightOptions;
}

export const DEFAULT_SETTINGS: DynamicHighlightsSettings = {
  selectionHighlighter: {
    highlightWordAroundCursor: true,
    highlightSelectedText: true,
    maxMatches: 100,
    minSelectionLength: 3,
    highlightDelay: 0,
    ignoredWords: ignoredWords,
  },
  staticHighlighter: {
    queries: {},
    queryOrder: [],
  },
};

export function setAttributes(element: any, attributes: any) {
  for (let key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
}
