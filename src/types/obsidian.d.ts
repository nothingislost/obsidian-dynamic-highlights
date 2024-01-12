import "obsidian";

declare module "obsidian" {
    export interface Workspace {
        updateOptions(): void;
    }

    export interface Menu {
        dom: HTMLElement;
    }
}
