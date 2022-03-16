## Dynamic Highlights

An Obsidian plugin that dynamically highlights text based on selection or search query.

This plugin currently only works in the Source or Live Preview editor modes. For now it will not affect Reading mode or the Legacy Editor.

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

### Persistent Highlights

Persistent highlights are created by defining a search query and associating a CSS class name and color. Once defined, any string that matches the search query will be marked with the associated CSS class and will receive background color that matches the chosen color.

Search queries can be written using regular expressions as long as you toggle the regex option for the query.

You can define as many unique highlighters as you'd like as long as the class names are unique. Performance may be impacted when creating a large number of complex regex queries so be mindful of your regex complexity.

#### Examples

You can import the examples with the `Import` Button at the top right of the plugin's settings.

##### Visual Linting
Highlights double spaces, empty list markers, double list markers, preceding spaces, and trailing spaces. 

```json
"Mini-Linting": {
    "class": "Mini-Linting",
    "color": "#A70F0F38",
    "regex": true,
    "query": "( {2,}(?!\|)|- - |^\\s*- \\n|^ +(?![0-9-`])|[^ ] $)",
    "mark": [
      "match"
    ],
    "css": ".cm-active .Mini-Linting {\n  background: none;\n}"
  },
```

##### Strike Out Filler Words to avoid in Writing
```json
{
  "Filler-Words": {
    "class": "Filler-Words",
    "color": "#2D801838",
    "regex": true,
    "query": "\\b([Aa] bit|[Aa]bsolutely|[Aa]ctually|[Aa]nd all that|[Aa]nd so forth|[Aa]nyway|[Bb]asically|[Cc]ertainly|[Cc]learly|[Cc]ompletely|[Dd]efinitely|[Ee]ffectively|[Ee]ntirely|[Ee]ssentially|[Ee]vidently|[Ee]xtremely|[Ff]airly|[Ff]rankly|[Ff]requently|[Gg]enerally|[Hh]opefully|[Kk]ind of|[Ll]argely|[Ll]iterally|[Mm]ore or less|[Mm]ostly|[Oo]ccasionally|[Oo]ften|[Oo]verall|[Pp]articularly|[Pp]erhaps|[Pp]ossibly|[Pp]ractically|[Pp]recisely|[Pp]resumably|[Pp]retty|[Pp]rimarily|[Pp]robably|[Pp]urely|[Qq]uite|[Rr]arely|[Rr]ather|[Rr]eally|[Rr]elatively|[Ss]eriously|[Ss]ignificantly|[Ss]imply|[Ss]lightly|[Ss]omehow|[Ss]ort of|[Ss]pecifically|[Ss]trongly|[Ss]upposedly|[Ss]urely|[Tt]he fact that|[Tt]otally|[Tt]ruly|[Tt]ypically|[Uu]ltimately|[Uu]sually|[Vv]ery|[Vv]irtually|[Ww]idely)\\b",
    "mark": [
      "match"
    ],
    "css": ".cm-line .Filler-Words{\n\ttext-decoration: line-through;\n\tbackground: none;\n\tcolor: var(--text-muted);\n}\n\n/* where to disable */\n.HyperMD-quote.cm-line .Filler-Words,\n.pdf-annotations .cm-line .Filler-Words {\n\ttext-decoration: none;\n\tcolor: unset;\n}"
  }
}
```

##### Highlight Custom Styles in Pandoc Exports (`:::`)

```json
{
  "Pandoc-Syntax": {
    "class": "Pandoc-Syntax",
    "color": "#77787C4A",
    "regex": true,
    "query": "::: \\{.*?\\}[\\s\\S]*?:::",
    "mark": [
      "match",
      "group"
    ],
    "css": ""
  }
}
```

### Settings

#### Delay

The delay before highlighting is applied after moving the cursor

#### Ignored Words

A comma delimited list of words that will not be highlighted

The default list can be found here: https://gist.github.com/sebleier/554280

### Limitations

- There is currently no support for dynamic highlights in reading/preview mode.
- Only strings with 3 or more characters will be highlighted in selection highlight mode

### Acknowledgments
Thanks to @chrisgrieser aka @pseudometa for the plugin idea and feedback. 
Thanks to @chetachiezikeuzor for the plugin settings UI code which was inspired by https://github.com/chetachiezikeuzor/highlightr-Plugin/
