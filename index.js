// import {parse} from "svg-parser"
import fs from 'fs'

const exec1 = (regex, str, name, dbgOk=false, dbgErr=true) => {
  const group = regex.exec(str)?.[1];
  if(group) {
    if(dbgOk) console.log(`${name}: "${group}"`);
    return group;
  }
  if(dbgErr) console.log(`\nError: "${name}" missing from\n` +
              `${str.slice(0,80)} ${str.length > 80 ? ' ...' : ''}`);
  return null;
}
const exec = (regex, str, name, dbgOk=false, dbgErr=true) => {
  const groups = regex.exec(str);
  if(groups) {
    if(dbgOk) console.log(`${name}: "${groups}"`);
    return groups;
  }
  if(dbgErr) console.log(`\nError: "${name}" missing from\n` +
              `${str.slice(0,80)} ${str.length > 80 ? ' ...' : ''}`);
  return null;
}

const reName     = new RegExp(/<font.*?id="(\w+?)".*?>/i);
const reHeight   = new RegExp(/<font-face.*?cap-height="(\d*?)".*?\/>/is);
const reGlyph    = new RegExp(/<glyph\s+?(.*?)\/>/igs);
const reUnicode  = new RegExp(/unicode="(.)"/i);
const reHAdvX    = new RegExp(/horiz-adv-x="([\d\.]*?)"/is);
const rePoints   = new RegExp(/d="(.*?)"/igs);
const rePoint    = new RegExp(/([ML])\s+([\d\.]+)\s+([\d\.]+)/igs);

const fontPaths = ['fonts/Hershey/HersheySans1.svg', 
                   'fonts/Hershey/HersheyGothEnglish.svg'];

let output = `\nconst fonts = {`

for (let fontPath of fontPaths) { 

  const svg = fs.readFileSync(fontPath).toString();

  const name   = exec1(reName,   svg,   'name');
  const height = exec1(reHeight, svg, 'height');
  output += `\n${name}:{height:${height},`;

  let glyph;
  while (glyph = exec1(reGlyph, svg, 'glyph', false, false)) {

    const unicode = exec1(reUnicode, glyph, 'unicode',false,false);
    if(!unicode || ![' ','!','W','y','a','t'].includes(unicode)) continue;

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
