import "obsidian";

declare module "obsidian" {
    export interface Workspace {
        updateOptions(): void;
    }

    export interface WorkspaceLeaf {
        id: string;
    }

    export interface Menu {
        dom: HTMLElement;
        select(): void;
    }

    export interface MenuItem {
        dom: HTMLElement;
    }

    export interface ColorComponent {
        colorPickerEl: HTMLElement;
    }
}
