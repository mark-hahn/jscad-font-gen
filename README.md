##  --- jscad-font-gen ---

A utility to convert single-line svg fonts to jscad font data. It can create modules for importing or it can inject the font data directly into a jscad file.

Installation ...
```
git clone git@github.com:mark-hahn/jscad-font-gen.git
cd jscad-font-gen
npm i
```

Command-line options
* -l regex  

  - Limit letters to ones that match the regex.
  - Defaults to [\\x20-\\x7E] which matches all ascii characters that jscad can handle
  - Remember to enclose it in single-quotes if it has backslashes or spaces.

* -m
  - Flag that indicates the output should include code to make the file an importable module. An existing text/code in the module, but not in the injected section, will be retained.

* -i input-path.svg
  - The svg file to convert or a directory containing svg files. Directory scanning is recursive. Only files with a `.svg` suffix will be processed.

* -o output-path.js
  - Output file.  Only one file is created even if there are multiple input files.  If the file exists then the font data will only be injected. Any text, such as code, that is not in an injected section will be preserved.

Usage examples ...
```
  node index.js # Convert all ascii chars in all svg files in the directory *fonts*(recursive) and inject the font data into the *fonts/jscad-fonts.js* file.

  node index.js -l [A-Z] # Same as above but convert only uppercase letters.

  node index.js -m -i my-fonts -o my-fonts/out.js # Convert svg files in my-fonts directory and inject them in a module fonts/out.js.  If the file exists, replace any previously injected contents.

  node index.js -m -i fonts/EMS/afont.svg -o jscad-fonts/afont.js # Convert one file and create/update a module ready to import into an jscad file 
```

The fonts are stored in an object.  Each property key is the font name taken from the id field in the svg source.  The property is the font data ready for a jscad text command.

Source example ...
```
import fonts from './fonts/jscad-fonts.js';
let {width, segments} = vectorChar(
      {font:fonts.EMSSpaceRocks, xOffset:0}, 'X');
```

Example of resulting text/jscad file that had code injected. Any previously injected font code was replaced.

```
Some text/code that will not be disturbed.

//=== Fonts injected by jscad-font-gen ===
const fonts = {
EMSSpaceRocks:{height:500,
97:[512,0.00,0.00,0.00,372.36,186.18,558.55,372.36,372.36,372.36,0.00,,0.00,186.18,372.36,186.18,],
67:[512,372.36,0.00,0.00,0.00,0.00,558.55,372.36,558.55,],
109:[512,0.00,0.00,0.00,558.55,186.18,372.36,372.36,558.55,372.36,0.00,],},
}
//=== End of injected fonts ===
```

There are ems and hershey svg fonts in the fonts directory.  These were taken from a github repo but I can't remember which one (anyone know?).  They were originally provided for use in the hershey extension for inkscape.

License: MIT
