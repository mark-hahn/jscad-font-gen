import fs         from 'fs';
import yargs      from 'yargs';
import {hideBin}  from 'yargs/helpers';
import { Bezier } from "bezier-js";


//////////  COMMAND-LINE OPTIONS  ///////////
const argv = yargs(hideBin(process.argv)).argv;
// console.log({argv});

const makeModule = argv.m;
const human      = argv.h;

const humanSpace = (human ? ' '    : '');
const humanLf    = (human ? '\n'   : '');
const humanLf2   = (human ? '\n\n' : '');

let lettersRegex = argv.l;
if(lettersRegex === true) {
  console.log(`Error: found "-l" but no regex follows`);
  process.exit();
}
if(!argv.l) lettersRegex = '[\\x20-\\x7E]';
let reLetters;
try {
  reLetters = new RegExp(lettersRegex);
}
catch(e) {
    console.log(`Error: invalid regex "${lettersRegex}"`);
    process.exit();
}

let inputFile = argv.i;
if(inputFile === true) {
  console.log(`Error: found "-i" but no file path follows`);
  process.exit();
}
if(!fs.existsSync(inputFile)) {
  if(fs.existsSync('fonts')) {
    console.log(`Warning: input "${inputFile}" doesn't exist.`);    inputFile = 'fonts';
  }
  else {
    console.log(`Error: neither "${inputFile}" ` +
                `nor "fonts" directory found`);
    process.exit();
  }
}

const DEFAULT_OUTPUT = 'fonts/jscad-fonts.js'
let outputFile = argv.o;
if(outputFile === true) {
  console.log(`Error: found "-o" but no file path follows`);
  process.exit();
}
if(!outputFile) outputFile = DEFAULT_OUTPUT;
else if(!makeModule && !fs.existsSync(outputFile)) {
  console.log(
    `Warning: file "${outputFile}" doesn't exist.`);
  console.log('The output file must exist for injection of font(s).');
  console.log(`If you want to create a new module use -m option`);
  console.log(`using "${DEFAULT_OUTPUT}"`);
  outputFile = DEFAULT_OUTPUT;
}
if(!makeModule && !fs.existsSync(outputFile)) {
  console.log(`Error: file ${outputFile} doesn't exist`);
  process.exit();
}

console.log(`Using:`+
          `\n  Regex:  ${lettersRegex}` +
          `\n  Input:  ${inputFile}` +
          `\n  Output  ${outputFile}`);


//////////////  FILE PATHS  //////////////

let fontFiles = [];
const walkDir = function(dir) {
  var list = fs.readdirSync(dir);
  list.forEach( (file) => {
    file = dir + '/' + file;
    var stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      fontFiles = fontFiles.concat(walkDir(file));
    } else { 
      if(file?.endsWith('.svg') || file?.endsWith('.js')) 
        fontFiles.push(file);
    }
  });
}
if(!fs.existsSync(inputFile)) {
  console.log(`Error: file/directory ${inputFile} not found`);
  process.exit();
}
else if(fs.lstatSync(inputFile).isDirectory()) {
  console.log(
    `Scanning input directory ${inputFile} recursively`);
  walkDir(inputFile);
}
else {
  if(inputFile?.endsWith('.svg') ||
     inputFile?.endsWith('.js') ) fontFiles = [inputFile];
  else {
    console.log(`Error: ${inputFile} is not an.svg or .js file`);
    process.exit();
  }
}
fontFiles = fontFiles.filter(path => !!path);
if(fontFiles.length == 0) {
  console.log(`Error: no .svg file found`);
  process.exit();
}

//////////  REGEX  ///////////

const exec1 = (regex, str, name, debug=false, required=true) => {
  const groups = regex.exec(str);
  if(groups) {
    if(!groups[1]) {
      if(required) console.log(`Error: "${name}" missing group[1]: ${{groups}}`);
      return null;
    }
    if(groups[2]) {
      if(required) console.log(`Error: "${name}" has too many groups: ${{groups}}`);
      return null;
    }
    if(debug) console.log(`${name}: "${groups[1]}"`);
    return groups[1];
  }
  if(required) console.log(`Error: "${name}" missing regex ${regex} from ` +
              `${str.slice(0,80)} ${str.length > 80 ? ' ...' : ''}`);
  return null;
}
const exec = (regex, str, name, debug=false, required=true) => {
  const groups = regex.exec(str);
  if(groups) {
    if(debug) {
      let str = '';
      for(let i=1; i < groups.length; i++) 
        str += (groups[i] === undefined ? ',' : (groups[i]) + ',');
      console.log(`${name}: ${str.slice(0,-1)}`);
    }
    return groups;
  }
  if(required) console.log(`Error: "${name}" missing from` +
              `${str.slice(0,80)} ${str.length > 80 ? ' ...' : ''}`);
  return null;
}

const reName    = new RegExp(/<font.*?id="(.+?)".*?[<>]/is);
const reHeight  = new RegExp(/<font-face.*?cap-height="(\d*?)".*?\/>/is);
const reGlyph   = new RegExp(/<glyph\s+?(.*?)\/>/igs);
const reUnicode = new RegExp(/unicode="(.)"/i);
const reHAdvX   = new RegExp(/horiz-adv-x="([\d\.]*?)"/is);
const rePath    = new RegExp(/d="(.*?)"/is);
const rePathEle = new RegExp(
        /[\s,]*([A-Za-z])|[\s,]*([\d\.-]+)[\s,]+([\d\.-]+)/gs);


//////////  GENERATE OUTPUT TEXT ///////////

let output = 'const fonts = {'

for (let fileName of fontFiles) { 
  console.log(`Processing ${fileName} ...`);

  if(fileName.endsWith('.svg')) {
    const svg = fs.readFileSync(fileName).toString();

    const fontName = exec1(reName,   svg, 'font-name', true)?.replace(/\s/g, '');;
    const height   = exec1(reHeight, svg, 'height');

    output += `\n"${fontName}":{height:${height},`;

    let glyph;
    while (glyph = exec1(reGlyph, svg, 'glyph', false, false)) {

      const unicode = exec1(reUnicode, glyph, 'unicode',false,false);
      if(!unicode || !reLetters.test(unicode)) continue;

      // console.log(`\n---- Processing char ${unicode} ----`);

      if(human)
        output += `\n\n/* ${unicode} */ ${unicode.charCodeAt(0)}:` +
                  `[${exec1(reHAdvX, glyph, 'horiz-adv-x', false, true)}, `;
      else
        output += `${unicode.charCodeAt(0)}:` +
                  `[${exec1(reHAdvX, glyph, 'horiz-adv-x', false, true)},`;

      const path = exec1(rePath, glyph, 'path', false, true);
      if(path) {
        let firstMove = true;
        let cmd = '', cpx = 0, cpy = 0, pathEle;
        while ((pathEle = exec(rePathEle, path, 'pathEle', false, false))) {
          let [,ltr,x,y] = pathEle;
          if(ltr) {
            // we have a letter, ltr (beginning of command)
            if(!"MmLlCc".includes(ltr)) {
              console.log(`Error: unsupported letter '${ltr}' ` +
                          `in path: ${path}`);
              process.exit();
            }
            if(!firstMove && (ltr == 'M' || ltr == 'm'))  
              // move command starts new segment
              // but don't add extra comma at beginning
              output += `,${humanSpace}`; 
            cmd = ltr;
          }
          else {
            // we have a point x,y, check if absolute
            const abs = (cmd == cmd.toUpperCase() || firstMove);
            firstMove = false;

            switch(cmd.toUpperCase()) {

              case 'M': case 'L': 
                if(abs) { cpx  = +x; cpy  = +y; }
                else    { cpx += +x; cpy += +y; }
                output += `${cpx},${cpy},${humanSpace}`; 
                break;

              case 'C': 
                let x1 = x, y1 = y;
                let [,,x2,y2] = 
                  exec(rePathEle, path, 'pathEle x2,y2', false, true);
                [,,x,y] = 
                  exec(rePathEle, path, 'pathEle x, y ', false, true);
                if(abs) { x1 = +x1;  y1 = +y1; 
                          x2 = +x2;  y2 = +y2; 
                          x  = +x;   y  = +y; }
                else    { x1 = +x1 + cpx;  y1 = +y1 + cpy; 
                          x2 = +x2 + cpx;  y2 = +y2 + cpy; 
                          x  = +x  + cpx;  y  = +y  + cpy; }

                new Bezier(x1,y1,x2,y2,x,y).getLUT(10).forEach(p => {
                  output += `${p.x.toFixed(2)},${p.y.toFixed(2)},` +
                            `${humanSpace}`;
                });

                cpx = x; cpy = y;
                break;
            }
          }
        }
      }
      output += '],';
    }
  }
  else if(fileName.endsWith('.js')) {
    const js = fs.readFileSync(fileName).toString();
    const groups = /(\w*?)\s*=\s*(.*?\})/gs.exec(js);
    if(!groups) {
      console.log(`Error: no font data found in vector file ${fileName}`);
      process.exit();
    }
    let [,fontName, objStr] = groups;

    objStr = objStr.replace(/(\w+)\:/gs,'"$1":');
    objStr = objStr.replace(/,\s*]/gs, ']');
    objStr = objStr.replace(/,\s*}/gs, '}');
    objStr = objStr.replace(/,\s*,/gs, ',null,');
    console.log(`objStr: ${objStr.slice(0,100)}`);
    let fontData = {};
    try {
      fontData = JSON.parse(objStr);
    } catch (e) {
      console.log(`Error: parsing font data JSON failed: ${e}`);
      process.exit();
    }
    output += `\n"${fontName}":{height:${fontData.height},`;

    for(let i=0; i<128; i++) {
      const path = fontData[i];
      let charStr;
      if(path === undefined ||
        !(reLetters.test((charStr = String.fromCharCode(i)))))
        continue;
      console.log(`---- Processing char ${charStr} ----`);
      const pathStr = JSON.stringify(path).replace(/null/g,'');
      if(human)
        output += `\n/* ${charStr} */ ${i}: ${pathStr},\n`;
      else
        output += `${i}:${pathStr},`;
    }
  }
  output += `},${humanLf}`;
}
output += `};${humanLf}`;

if(human) {
  output = output.replace(/,(\d+,\d+)/gs,', $1');
  output = output.replace(/,,/g, ',\n/* segment */,');
}

if(makeModule) output += `\nexport default fonts;${humanLf2}`

const INJECTED_TEXT_INTRO = 
  '\n//=== Fonts injected by jscad-font-gen ===\n';
const INJECTED_TEXT_OUTRO = 
  '\n//=== End of injected fonts ===\n';

output = INJECTED_TEXT_INTRO + output + INJECTED_TEXT_OUTRO;

const reInjectionStr = INJECTED_TEXT_INTRO + 
                '.*' + INJECTED_TEXT_OUTRO;

let fileOut = fs.readFileSync(outputFile).toString();
const reInjection = new RegExp(reInjectionStr,'igs');
fileOut = fileOut.replace(reInjection,'');
fileOut += output;

fs.writeFileSync(outputFile, fileOut);
