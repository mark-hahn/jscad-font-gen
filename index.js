// import {parse} from "svg-parser"
import fs      from 'fs'
import {getSystemErrorMap} from 'util';

const svg = fs.readFileSync(
              'fonts/Hershey/HersheyGothEnglish.svg').toString();

const exec = (str, regex, name, dbg=false) => {
  const group = regex.exec(str)?.[1];
  if(group) {
    if(dbg) console.log(`${name}: "${group}"`);
    return group;
  }
  console.log(`\nError: "${name}" missing from\n` +
              `${str.slice(0,80)} ${str.length > 80 ? ' ...' : ''}`);
  process.exit();
}

const reName    = new RegExp(/<font.*?id="(\w+?)".*?>/);
const reHeight  = new RegExp(/<font-face.*?cap-height="(\d*?)".*?\/>/s);
const reGlyph   = new RegExp(/<glyph\s+?(.*?)\/>/g);
const reUnicode = new RegExp(/unicode="(.)"/);
const reHAdvX   = new RegExp(/horiz-adv-x="(\d*?)"/s);
const reVec     = new RegExp(
  /M\s+?(\d+?)\s+?(\d+?)\s+?L\s+?(\d+?)\s+?(\d+?)/s);

const name   =          exec(svg, reName,   'name');
const height = parseInt(exec(svg, reHeight, 'height'));

let output = `{name:'${name}',height:${height},`;
// console.log(output);

let glyphExec;
while (glyphExec = reGlyph.exec(svg)) {
  const glyph = glyphExec[0];
  // console.log({glyph});

  const unicode = exec(glyph, reUnicode, 'unicode').charCodeAt(0);
  const hAdvX   = exec(glyph, reHAdvX, 'horiz-adv-x');

  output += `${unicode}:[${parseInt(hAdvX)},`;
  reVec.lastIdx = 0
  let vec;
  while (vec = reVec.exec(glyph)) {
    // console.log({vec});
    const [,startX, startY, endX, endY] = vec;
    output += `${startX},${startY},${endX},${endY},`;
    break;
  }
  output += '],';

  output += '}';

  console.log(output);

  break;
}
