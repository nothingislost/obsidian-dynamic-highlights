## Dynamic Highlights

An Obsidian plugin that dynamically highlights text based on selection or search query.

This plugin currently only works in the Source or Live Preview editor modes. For now it will not affect Reading mode or the Legacy Editor.

### Persistent Highlights

Persistent highlights are created by defining a search query and associating a CSS class name and color. Once defined, any string that matches the search query will be marked with the associated CSS class and will receive background color that matches the chosen color.

Search queries can be written using regular expressions as long as you toggle the regex option for the query.

You can define as many unique highlighters as you'd like as long as the class names are unique. Performance may be impacted when creating a large number of complex regex queries so be mindful of your regex complexity.

### Selection Highlights

If there is no active selection, all occurences of the word underneath the current cursor position will be highlighted
- Word matching is case insensitive
- The word currently under the cursor will be marked with `.cm-current-word`
- Occurences of the current word found elsewhere in the document will be marked with `cm-matched-word`
- All occurences will recieve the `data-contents` data attribute which will hold the current word value

If there is an active selection, all occurences of the text inside the selection will be highlighted.
- String matching is case insensitive
- The currently selected string will be marked by default with `.cm-selection`
- Occurences of the currently selected string found elsewhere in the document will be marked with `cm-matched-string`
- All matches will recieve the `data-contents` data attribute which will hold the selected string value

### Settings

#### Delay

The delay before highlighting is applied after moving the cursor

#### Ignored Words

A comma delimted list of words that will not be highlighted

The default list can be found here: https://gist.github.com/sebleier/554280

### Limitations

- There is currently no support for dynamic highlights in reading/preview mode.
- Only strings with 3 or more characters will be highlighted in selection highlight mode

### Installing via BRAT

Install the BRAT plugin via the Obsidian Plugin Browser and then add the beta repository "nothingislost/obsidian-dynamic-highlights"

### Manually installing the plugin

- Download the latest release from https://github.com/nothingislost/obsidian-dynamic-highlights/releases
- Copy over `main.js`, ``manifest.json`, `styles.css` to your vault `VaultFolder/.obsidian/plugins/obsidian-dynamic-highlights/`.

### Acknowledgments
Thanks to @chrisgrieser for the plugin idea and feedback. 
Thanks to @chetachiezikeuzor for the plugin settings UI code which was inspired by https://github.com/chetachiezikeuzor/highlightr-Plugin/