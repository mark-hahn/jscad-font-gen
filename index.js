import fs        from 'fs'
import yargs     from 'yargs'
import {hideBin} from 'yargs/helpers'

// import fonts     from './fonts/jscad-fonts.js'
// console.log(fonts.EMSSpaceRocks);

//////////  PROCESS COMMAND-LINE OPTIONS  ///////////
const argv = yargs(hideBin(process.argv)).argv;

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

//////////////  FIND FILE PATHS  //////////////

let fontPaths = [];
const walkDir = function(dir) {
  var list = fs.readdirSync(dir);
  list.forEach( (file) => {
    file = dir + '/' + file;
    var stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      fontPaths = fontPaths.concat(walkDir(file));
    } else { 
      if(file && file.endsWith('.svg')) fontPaths.push(file);
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
  if(inputFile?.endsWith('.svg')) fontPaths = [inputFile];
  else {
    console.log(`Error: ${inputFile} is not an.svg file`);
    process.exit();
  }
}
fontPaths = fontPaths.filter(path => !!path);
if(fontPaths.length == 0) {
  console.log(`Error: no .svg file found`);
  process.exit();
}

//////////  REGEX UTILITIES  ///////////

const exec1 = (regex, str, name, dbgOk=false, dbgErr=true) => {
  const group = regex.exec(str)?.[1];
  if(group) {
    if(dbgOk) console.log(`${name}: "${group}"`);
    return group;
  }
  if(dbgErr) console.log(`Error: "${name}" missing from ` +
              `${str.slice(0,80)} ${str.length > 80 ? ' ...' : ''}`);
  return null;
}
const exec = (regex, str, name, dbgOk=false, dbgErr=true) => {
  const groups = regex.exec(str);
  if(groups) {
    if(dbgOk) console.log(`${name}: "${groups}"`);
    return groups;
  }
  if(dbgErr) console.log(`Error: "${name}" missing from` +
              `${str.slice(0,80)} ${str.length > 80 ? ' ...' : ''}`);
  return null;
}

const reName     = new RegExp(/<font.*?id="(\w+?)".*?>/i);
const reHeight   = new RegExp(/<font-face.*?cap-height="(\d*?)".*?\/>/is);
const reGlyph    = new RegExp(/<glyph\s+?(.*?)\/>/igs);
const reUnicode  = new RegExp(/unicode="(.)"/i);
const reHAdvX    = new RegExp(/horiz-adv-x="([\d\.]*?)"/is);
const rePoints   = new RegExp(/d="(.*?)"/igs);
const rePoint    = new RegExp(/([ML])\s+([\d\.-]+)\s+([\d\.-]+)/igs);

//////////  GENERATE OUTPUT TEXT ///////////

const INJECTED_TEXT_INTRO = 
  '\n//=== Fonts injected by jscad-font-gen ===\n';
const INJECTED_TEXT_OUTRO = 
  '//=== End of injected fonts ===\n';

let output = INJECTED_TEXT_INTRO + 'const fonts = {'

for (let fontPath of fontPaths) { 
  console.log(`Processing ${fontPath} ...`);
  const svg = fs.readFileSync(fontPath).toString();

  const name   = exec1(reName,   svg,   'name');
  const height = exec1(reHeight, svg, 'height');
  output += `\n${name}:{height:${height},`;

  let glyph;
  while (glyph = exec1(reGlyph, svg, 'glyph', false, false)) {

    const unicode = exec1(reUnicode, glyph, 'unicode',false,false);
    if(!unicode || !reLetters.test(unicode)) continue;

    output += `\n${unicode.charCodeAt(0)}:`;
    output += `[${exec1(reHAdvX, glyph, 'horiz-adv-x')}`;

    const points = exec1(rePoints, glyph, 'points', false, false);
    if(!points) {
      output += ',],';
    }
    else {
      let point;
      rePoint.lastIndex = 0;
      while (point = exec(rePoint, points, 'point', false, false)) {
        const [,m,x,y] = point;
        output += `${m == 'M' ? ',' : ''}${x},${y},`;
      }
      if(rePoints.lastIndex = 0) output += ',';
      output += '],';
    }
  }
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
