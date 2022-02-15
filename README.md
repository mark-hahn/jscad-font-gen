##  --- jscad-font-gen ---

A utility to convert single-line svg fonts to jscad font data. It can create modules for importing or it can inject the font data directly into a jscad file.

Installation ...
```
git clone git@github.com:mark-hahn/jscad-font-gen.git
cd jscad-font-gen
npm i
```

Command-line options
* -i regex  

  - Limit letters to ones that match the regex.
  - Defaults to [\\x20-\\x7E] which matches all ascii characters that jscad can handle
  - Remember to enclose it in single-quotes if it has backslashes or spaces.

* -m
  - Flag that indicates the output should include code to make the file an importable module.
  - If not specified then font data is injected directly into the output file.

* -i input-path.svg
  - The svg file to convert or a directory containing svg files.

* -o output-path.js
  - Output file.  Only one file is created even if there are multiple input files.

Usage examples ...
```
  node index.js # Convert all ascii chars in all fonts/ svg files (recursive) and inject them into 'fonts/jscad-fonts.js' jscad file

  node index.js -l [A-Z] # Convert only uppercase letters.

  node index.js -m -i my-fonts  -o my-fonts/out.js # Convert all svg files in my-fonts directory and put them in a module fonts/out.js.  Replace contents if exists.
```

The fonts are stored in an object.  Each property key is the font name taken from the id field in the svg source.

Source example ...
```

```

There are ems and hershey fonts in the fonts directory.  These were taken from a github repo but I can't remember which one (anyone know?).  They were originally provided for use in the hershey extension for inkscape.

License: MIT
