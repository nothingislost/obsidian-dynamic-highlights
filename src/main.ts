import { Extension, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { debounce, MarkdownView, Plugin, Setting, TextComponent } from "obsidian";
import { highlightSelectionMatches, reconfigureSelectionHighlighter } from "./highlighters/selection";
import { buildStyles, staticHighlighterExtension } from "./highlighters/static";
import addIcons from "./icons/customIcons";
import { DEFAULT_SETTINGS, DynamicHighlightsSettings, HighlighterOptions } from "./settings/settings";
import { SettingTab } from "./settings/ui";
import { highlightSearchMatches, reconfigureSearchHighlighter, SearchColorOption } from "./highlighters/real-time";
import { generateMenu } from "./action/generateMenuUI";

interface CustomCSS {
    css: string;
    enabled: boolean;
}

export default class DynamicHighlightsPlugin extends Plugin {
    settings: DynamicHighlightsSettings;
    extensions: Extension[];
    styles: Extension;
    staticHighlighter: Extension;
    selectionHighlighter: Extension;
    customCSS: Record<string, CustomCSS>;
    styleEl: HTMLElement;
    settingsTab: SettingTab;

    // For adding action to view, we need to keep track of the added leaf id
    // So we can remove it when the plugin is unloaded
    addedLeafIdMap: Map<string, HTMLElement> = new Map();

    async onload() {
        await this.loadSettings();
        this.settingsTab = new SettingTab(this.app, this);
        this.addSettingTab(this.settingsTab);

        addIcons();
        this.staticHighlighter = staticHighlighterExtension(this);
        this.extensions = [];
        this.updateSelectionHighlighter();
        this.updateStaticHighlighter();
        this.updateStyles();
        this.registerEditorExtension(this.extensions);
        this.registerEditorExtension([highlightSearchMatches(this.settings.searchHighlighter)]);
        this.initCSS();

        // Add actions to view
        this.addActionToView();
    }

    onunload() {
        super.onunload();
        this.addedLeafIdMap.forEach((el) => el.detach());
        this.addedLeafIdMap.clear();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        if (this.settings.selectionHighlighter.highlightDelay < 200) {
            this.settings.selectionHighlighter.highlightDelay = 200;
            this.saveSettings;
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.updateConfig('search', this.settings.searchHighlighter);
    }

    initCSS() {
        let styleEl = (this.styleEl = document.createElement("style"));
        styleEl.setAttribute("type", "text/css");
        document.head.appendChild(styleEl);
        this.register(() => styleEl.detach());
        this.updateCustomCSS();
    }

    addActionToView() {
        this.app.workspace.onLayoutReady(() => {
            this.app.workspace.iterateAllLeaves((leaf) => {
                const element = leaf.view instanceof MarkdownView && leaf.view.addAction('filter', 'Filter', async (evt) => {
                    const menu = generateMenu(this, leaf, evt);
                    menu.showAtMouseEvent(evt);
                });
                element && this.addedLeafIdMap.set(leaf.id, element);
            });
        });

        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            if (!leaf) return;

            const el = this.addedLeafIdMap.get(leaf?.id);
            if (el) return;
            const newEl = leaf.view instanceof MarkdownView && leaf.view.addAction('filter', 'Filter', async (evt) => {
                const menu = generateMenu(this, leaf, evt);
                menu.showAtMouseEvent(evt);
            });
            newEl && this.addedLeafIdMap.set(leaf.id, newEl);
        }));
    }

    updateCustomCSS() {
        this.styleEl.textContent = Object.values(this.settings.staticHighlighter.queries)
            .map(q => q && q.css)
            .join("\n");
        this.app.workspace.trigger("css-change");
    }

    updateStyles() {
        this.extensions.remove(this.styles);
        this.styles = buildStyles(this);
        this.extensions.push(this.styles);
        this.app.workspace.updateOptions();
    }

    updateStaticHighlighter() {
        this.extensions.remove(this.staticHighlighter);
        this.staticHighlighter = staticHighlighterExtension(this);
        this.extensions.push(this.staticHighlighter);
        this.app.workspace.updateOptions();
    }

    updateSelectionHighlighter() {
        this.extensions.remove(this.selectionHighlighter);
        this.selectionHighlighter = highlightSelectionMatches(this.settings.selectionHighlighter);
        this.extensions.push(this.selectionHighlighter);
        this.app.workspace.updateOptions();
    }

    iterateCM6(callback: (editor: EditorView) => unknown) {
        this.app.workspace.iterateAllLeaves(leaf => {
            leaf?.view instanceof MarkdownView &&
            (leaf.view.editor as any)?.cm instanceof EditorView &&
            callback((leaf.view.editor as any).cm);
        });
    }

    updateConfig = debounce(
        (type: string, config: HighlighterOptions) => {
            let reconfigure: (config: HighlighterOptions) => StateEffect<unknown>;
            if (type === "selection") {
                reconfigure = reconfigureSelectionHighlighter;
            } else if (type === 'search') {
                reconfigure = reconfigureSearchHighlighter;
            } else {
                return;
            }
            this.iterateCM6(view => {
                view.dispatch({
                    effects: reconfigure(config),
                });
            });
        },
        1000,
        true
    );
}
