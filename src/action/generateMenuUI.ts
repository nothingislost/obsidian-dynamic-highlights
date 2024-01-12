import {
    ButtonComponent,
    ColorComponent, Component,
    debounce, ExtraButtonComponent,
    MarkdownView,
    Menu, setIcon,
    Setting,
    TextComponent,
    WorkspaceLeaf
} from "obsidian";
import { SearchColorOption } from "../highlighters/real-time";
import DynamicHighlightsPlugin from "../main";

const updateQuery = debounce(async (plugin: DynamicHighlightsPlugin, {
    path, query, queryMap, type, value
}: {
    path: string, query: SearchColorOption, queryMap: SearchColorOption[], type: 'queryStr' | 'colorStr', value: string
}) => {
    query[type] = value;
    plugin.settings.searchHighlighter.highlightQuery[path] = [
        ...queryMap.filter((q) => q[type] !== query[type]),
        query,
    ];
    await plugin.saveSettings();
}, 300, true);

const deleteQuery = debounce(async (plugin: DynamicHighlightsPlugin, {
    path, id, queryMap
}: {
    path: string, id: number, queryMap: SearchColorOption[]
}) => {
    queryMap.splice(id, 1);

    plugin.settings.searchHighlighter.highlightQuery[path] = [
        ...queryMap,
    ];
    await plugin.saveSettings();
}, 300, true);


export function generateMenu(plugin: DynamicHighlightsPlugin, leaf: WorkspaceLeaf, evt: MouseEvent) {
    // Use menu as a closable UI
    // So we need to prevent the menu from closing when clicking on the title/item
    const menu = new Menu();
    let dom = menu.dom;

    menu.addItem((item) => {
        item.onClick(evt => {
            evt.stopPropagation();
            evt.preventDefault();
        });
        dom = item.dom;
    });
    // Prevent the menu from closing when clicking on the title
    // And prevent the select behavior
    menu.select = () => {
    };

    dom?.toggleClass(["dynamic-highlights-menu", "dynamic-highlights-search-filter"], true);
    const path = (leaf.view as MarkdownView).file.path;
    if (!path) return menu;

    const generateQueryUI = () => {
        dom.empty();

        let queryMap = plugin.settings.searchHighlighter?.highlightQuery?.[path];
        if (!queryMap) {
            queryMap = [];
            plugin.settings.searchHighlighter!.highlightQuery![path] = queryMap;
        }

        queryMap && queryMap.length && queryMap.forEach((query: SearchColorOption, id: number) => {
            generateColorSelectorSettings({
                dom, plugin, path, query, queryMap, id, generateQueryUI
            });
        });
        generateAddButton({dom, plugin, path, queryMap, generateQueryUI});

    };

    generateQueryUI();
    return menu;
}


function generateColorSelectorSettings({
                                           dom, plugin, path, query, queryMap, id, generateQueryUI
                                       }: {
    dom: HTMLElement,
    plugin: DynamicHighlightsPlugin,
    path: string,
    query: SearchColorOption,
    queryMap: SearchColorOption[],
    id: number;

    generateQueryUI: () => void;
}) {
    const el = dom.createEl('div', {cls: 'dynamic-highlights-search-filter__query'});
    const colorEl = el.createEl('div', {cls: 'query-color-picker'});
    const textEl = el.createEl('div', {cls: 'query-text'});
    const deleteEl = el.createEl('div', {cls: 'query-delete'});

    // Generate components (color picker)
    const colorComponent = new ColorComponent(colorEl);
    colorComponent.colorPickerEl.onclick = (evt) => {
        evt.stopPropagation();
    };
    colorComponent.setValue(query.colorStr);
    colorComponent.onChange(async (value: string) => {
        updateQuery(plugin, {
            path, query, queryMap, type: 'colorStr', value
        });
    });

    // Generate components (text input)
    const textComponent = new TextComponent(textEl);
    textComponent.inputEl.onclick = (evt) => {
        evt.stopPropagation();
        setTimeout(() => {
            textComponent.inputEl.focus();
        }, 10);
    };
    textComponent.setValue(query.queryStr);
    textComponent.onChange(async (value) => {
        updateQuery(plugin, {
            path, query, queryMap, type: 'queryStr', value
        });
    });

    // Generate components (delete button)
    const buttonComponent = new ExtraButtonComponent(deleteEl);
    buttonComponent.onClick(() => {
        deleteQuery(plugin, {
            path, id, queryMap
        });
        setTimeout(() => {
            generateQueryUI();
        }, 400);
    });
    buttonComponent.setIcon('trash');
}


function generateAddButton({
                               dom, plugin, path, queryMap, generateQueryUI
                           }: {
    dom: HTMLElement,
    plugin: DynamicHighlightsPlugin,
    path: string,
    queryMap: SearchColorOption[],

    generateQueryUI: () => void;
}) {
    const buttonEl = dom.createEl('div', {cls: 'dynamic-highlights-search-filter__add-query'});

    const buttonComponent = new ButtonComponent(buttonEl);
    const iconEl = buttonComponent.buttonEl.createEl('span');
    setIcon(iconEl, 'plus');
    buttonComponent.buttonEl.createEl('span', {text: 'Add Query'});

    buttonComponent.onClick(async (evt) => {
        evt.stopPropagation();
        evt.preventDefault();
        const query = {queryStr: '', colorStr: ''};
        queryMap.push(query);
        updateQuery(plugin, {
            path, query, queryMap, type: 'colorStr', value: ''
        });
        await plugin.saveSettings();
        setTimeout(() => {
            generateQueryUI();
        }, 400);

    });
}
