import { StaticHighlightOptions } from "src/highlighters/static";
import { SelectionHighlightOptions } from "../highlighters/selection";
import { ignoredWords } from "./ignoredWords";

interface SearchConfig {
  value: string;
  type: string;
  range: { from: number; to: number };
}
export type markTypes = "line" | "match" | "group" | "start" | "end";

export type SettingValue = number | string | boolean;
export interface CSSSettings {
  [key: string]: SettingValue;
}

interface SearchQuery {
  query: string;
  class: string;
  color: string | null;
  regex: boolean;
  mark?: markTypes[];
  css?: string;
  enabled?: boolean;
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
