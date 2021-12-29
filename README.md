## Obsidian Highlight Current Word

An experimental Obsidian plugin that highlights content within the document using selection context.

If there is no active selection, all occurences of the word underneath the current cursor position will be highlighted
- Word matching is case insensitive
- The word currently under the cursor will be marked with `.cm-active-word`
- Occurences of the current word found elsewhere in the document will be marked with `cm-matched-word`
- All occurences will recieve the `data-current-word` data attribute which will hold the current word value

If there is an active selection, all occurences of the text inside the selection will be highlighted.
- String matching is case insensitive
- The currently selected string will be marked with `.cm-active-string`
- Occurences of the currently selected string found elsewhere in the document will be marked with `cm-matched-string`
- All occurences will recieve the `data-current-string` data attribute which will hold the selected string value

### Settings

#### Delay

The delay before highlighting is applied after moving the cursor

#### Ignored Words

A comma delimted list of words that will not be highlighted

The default list can be found here: https://gist.github.com/sebleier/554280

### Limitations

Only words with 3 or more characters will be highlighted

### Installing via BRAT

Install the BRAT plugin via the Obsidian Plugin Browser and then add the beta repository "nothingislost/obsidian-..."

### Manually installing the plugin

- Copy over `main.js`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/obsidian-.../`.
