import fs        from 'fs'
import yargs     from 'yargs'
import {hideBin} from 'yargs/helpers'

const argv = yargs(hideBin(process.argv)).argv;

let lettersRegex = argv.l;
if(!argv.l) lettersRegex = '[\\x00-\\xFF]';
let reLetters;
try {
  reLetters = new RegExp(lettersRegex);
}
catch(e) {
    console.log(`Error: invalid regex "${lettersRegex}"`);
    process.exit();
}

let inputFile = argv.i;
if(!fs.existsSync(inputFile)) {
  if(fs.existsSync('fonts')) {
    console.log(`Warning: input "${inputFile}" doesn't exist, ` + 
                `using "fonts/" directory`);
    inputFile = 'fonts';
  }
  else {
    console.log(`Error: neither "${inputFile}" ` +
                `nor "fonts/" directory found`);
    process.exit();
  }
}

let outputFile = argv.o;
if(!outputFile || !fs.existsSync(outputFile)) outputFile = 'fonts';
if(!fs.existsSync(outputFile)) {
  if(fs.existsSync('fonts')) {
    console.log(`Warning: output "${outputFile}" doesn't exist, ` + 
                `using "fonts/" directory`);
    outputFile = 'fonts';
  }
  else {
    console.log(`Error: neither ${outputFile} ` +
                `nor fonts directory found`);
    process.exit();
  }
}
console.log(`>>> Using letter regex "${lettersRegex}" ` +
            `with input "${inputFile}" and output "${outputFile}"`);

let fontPaths = [];

const walkDir = function(dir) {
  var list = fs.readdirSync(dir);
  list.forEach( (file) => {
    file = dir + '/' + file;
    var stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      fontPaths = fontPaths.concat(walkDir(file));
    } else { 
      if(file?.endsWith('.svg')) fontPaths.push(file);
    }
  });
}
if(fs.existsSync(inputFile)) {
  console.log(`Error: ${inputFile} not found`);
  process.exit();
}
else if(fs.lstatSync(inputFile).isDirectory()) {
  console.log(`Scanning input directory ${inputFile}`);
  walkDir(inputFile);
}
else {
  if(inputFile?.endsWith('.svg')) fontPaths = [inputFile];
  else {
    console.log(`Error: ${inputFile} is not an.svg file`);
    process.exit();
  }
}
if(fontPaths.length == 0) {
  console.log(`Error: no .svg file found`);
  process.exit();
}

console.log({fontPaths});

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

for (let fontPath of fontPaths) { 

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
output += '}';
console.log(output);
fs.writeFileSync("fonts/output.js", output);
