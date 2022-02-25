import fs         from 'fs';
import util       from 'util';
import {getSystemErrorMap} from 'util';
import yargs      from 'yargs';
import {hideBin}  from 'yargs/helpers';
import { Bezier } from "bezier-js";

// import fonts     from './fonts/jscad-fonts.js'
// console.log(fonts.EMSSpaceRocks);


//////////  COMMAND-LINE OPTIONS  ///////////
const argv = yargs(hideBin(process.argv)).argv;
// console.log({argv});

const makeModule = argv.m;

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
      if(file && file.endsWith('.svg')) fontFiles.push(file);
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
  if(inputFile?.endsWith('.svg')) fontFiles = [inputFile];
  else {
    console.log(`Error: ${inputFile} is not an.svg file`);
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

const INJECTED_TEXT_INTRO = 
  '\n//=== Fonts injected by jscad-font-gen ===\n';
const INJECTED_TEXT_OUTRO = 
  '//=== End of injected fonts ===\n';

let output = INJECTED_TEXT_INTRO + 'const fonts = {'

for (let fontFile of fontFiles) { 
  console.log(`Processing ${fontFile} ...`);
  const svg = fs.readFileSync(fontFile).toString();

  const name   = exec1(reName,   svg, 'font-name', true)?.replace(/\s/g, '');;
  const height = exec1(reHeight, svg, 'height');
  output += `"${name}":{height:${height},`;

  let glyph;
  while (glyph = exec1(reGlyph, svg, 'glyph', false, false)) {

    const unicode = exec1(reUnicode, glyph, 'unicode',false,false);
    if(!unicode || !reLetters.test(unicode)) continue;

    console.log(`\n---- Processing char ${unicode} ----`);

    output += `\n\n/* ${unicode} */ ${unicode.charCodeAt(0)}:` +
              `[${exec1(reHAdvX, glyph, 'horiz-adv-x', true)}, `;

    const path = exec1(rePath, glyph, 'path', true, false);
    if(path) {
      let cmd = '', cpx = 0, cpy = 0, pathEle;
      while ((pathEle = exec(rePathEle, path, 'pathEle', true, false))) {
        let [,ltr,x,y] = pathEle;
        if(ltr) {
          if(!"MmLlCc".includes(ltr)) {
            console.log(`Error: unsupported letter '${ltr}' ` +
                        `in path: ${path}`);
            process.exit();
          }
          if(cmd == '') ltr = 'M';
          else if(ltr == 'M' || ltr == 'm') 
            output += `, `; // double commas separate segments
          cmd = ltr;
        }
        else {
          // we have a point x,y at beginning of command
          const abs = (cmd == cmd.toUpperCase());

          switch(cmd.toUpperCase()) {

            case 'M': case 'L': 
              if(abs) { cpx  = +x; cpy  = +y; }
              else    { cpx += +x; cpy += +y; }
              console.log('ML:',{cpx,cpy});
              output += `${cpx},${cpy}, `; 
              break;

            case 'C': 
              let x1 = x, y1 = y;
              let [,,x2,y2] = 
                exec(rePathEle, path, 'pathEle x2,y2', true, true);
              [,,x,y] = 
                exec(rePathEle, path, 'pathEle x, y ', true, true);
              if(abs) { x1 = +x1; y1 = +y1; 
                        x2 = +x2; y2 = +y2; 
                        x  = +x;  y  = +y; }
              else    { x1 = +x1 + cpx; y1 = +y1 + cpy; 
                        x2 = +x2 + cpx; y2 = +y2 + cpy; 
                        x  = +x  + cpx; y  = +y  + cpy; }
              console.log('C:',{x1,y1,x2,y2,x,y});

              new Bezier(x1,y1,x2,y2,x,y).getLUT(8).forEach(p => {
                output += `${p.x.toFixed(2)},${p.y.toFixed(2)}, `;
              });
              cpx = x; cpy = y;
              break;
          }
        }
      }
    }
    output += '],';
  }
  // if(cpx == 0) output += '],';
  output += '},\n';
}
output += '}\n';

if(makeModule) output += '\nexport default fonts;\n\n'

output += INJECTED_TEXT_OUTRO;

let fileOut = '';
if(!makeModule) 
  fileOut = fs.readFileSync(outputFile).toString();

const reInjectionStr = INJECTED_TEXT_INTRO + 
                '.*' + INJECTED_TEXT_OUTRO;

const reInjection = new RegExp(reInjectionStr,'igs');
fileOut = fileOut.replace(reInjection,'');
fileOut += output;

fs.writeFileSync(outputFile, fileOut);
