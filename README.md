##  --- jscad-font-gen ---

jscad-font-gen is a node-based utility to convert single-line SVG font files to a jscad vector font data file (and more). 

I prefer SVG font files over `.ttf` files because they are a standard and widely available. I've personally found "single-line" `.ttf` files to be a kludge with paths being retraced needlessly or open-path paths being closed and screwing things up. 

jscad-font-gen can create modules for importing or it can inject the font data directly into a jscad file.  The injection can be done without blowing out the size of the file since only letters needed are included.

It can also include existing jscad font data modules in the output.  This feature supports all options including `-l` which selects letters to include and `-h` to make the output human readable.

jscad-font-gen outputs one or multiple files into a single output file.  So multiple files can be included in the jscad code with one import statement. The files included can be a mix of svg fonts and vector fonts.

### Installation ...
```
git clone git@github.com:mark-hahn/jscad-font-gen.git
cd jscad-font-gen
npm i
```

### Command-line options ...
* -l regex  

  - Limit letters to ones that match the regex.
  - Defaults to [\\x20-\\x7E] which matches all ascii characters that jscad can handle
  - Remember to enclose it in single-quotes if it has backslashes or spaces.

* -m
  - Flag that indicates the output should include code to make the file an importable module. Any existing text/code in the module, but not in the injected section, will be retained.

* -h
  - Add white space and comments to the converted jscad font data to make it human readable (requires knowledge of jscad font data format). I use this to  hack the font output and  tweak a letter's appearance or remove redundant retraced vectors.

* -i input-path.svg
  - The svg file to convert or a directory containing svg and vector font files. Directory scanning is recursive. Only files with a `.svg` suffix or `.js` suffix (vector fonts) will be processed.

* -o output-path.js
  - Output file.  Only one file is created even if there are multiple input files.  If the file exists then the font data will only be injected. Any text, such as code, that is not in the injected section will be preserved.

### Usage examples ...
```
  node index.js # Convert all ascii chars in all svg and vector files in the directory *fonts* (recursive) and inject the font data into the *fonts/jscad-fonts.js* file.

  node index.js -l [A-Z] # Same as above but convert only uppercase letters.

  node index.js -m -i my-fonts -o my-fonts/out.js # Convert svg files in my-fonts directory and inject them in a module fonts/out.js.  If the file exists, replace any previously injected contents.

  node index.js -mh -i fonts/EMS/afont.svg -o jscad-fonts/afont.js # Convert one file and create/update a module ready to import into an jscad file.  The vector data in the resulting module will be human-readable.
```

### Output format ...
The fonts are stored in an object.  Each property key is the font name taken from the id field in an svg font file or the export name in a vector data module.  The property for each key is the font data ready for a jscad text command.

### Source example ...
```
import fonts from './fonts/jscad-fonts.js';
let {width, segments} = vectorChar(
      {font:fonts.EMSSpaceRocks, xOffset:0}, 'X');
```

###  Ouput example ...
Resulting text/jscad file that had code injected. Any previously injected font code was replaced. The output shown has the `-h` human-readable option set.

```
Some text/code that will not be disturbed.

//=== Fonts injected by jscad-font-gen ===
const fonts = {
"EMSHerculean":{height:500,

/* X */ 88:[472, 59.9,12.6, 378,662, , 94.5,662, 413,12.6, ],

/* Y */ 89:[523, 59.9,662, 261,277, 261,12.6, 261,277, 454,662, ],},
};

//=== End of injected fonts ===
```

### Sample fonts ...
There are ems and hershey svg fonts in the fonts directory.  The svg fonts were taken from a github repo but I can't remember which one (anyone know?).  They were originally provided for use in the hershey extension for inkscape.

There are also vector fonts taken from the repo skarab42/jscad-vector-fonts.

License: MIT
