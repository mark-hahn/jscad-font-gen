// import {parse} from "svg-parser"
import fs      from 'fs'
import {getSystemErrorMap} from 'util';

const svg = fs.readFileSync(
              'fonts/Hershey/HersheyGothEnglish.svg').toString();

const exec = (str, regex, name, dbg=false) => {
  const group = regex.exec(str)?.[1];
  if(group) {
    if(dbg) console.log(name + ': ' + group);
    return group;
  }
  console.log(`\nError: "${name}" missing from\n` +
              `${str.slice(0,80)} ${str.length > 80 ? ' ...' : ''}`);
  process.exit();
}

const reName    = new RegExp(/<font.*?id="(\w+?)".*?>/);
const reHeight  = new RegExp(/<font-face.*?cap-height="(.*?)".*?\/>/s);
const reGlyph   = new RegExp(/<glyph\s+?(.*?)\/>/g);
const reUnicode = new RegExp(/unicode="(.)"/);

const name   = exec(svg, reName,   'name');
const height = exec(svg, reHeight, 'height');

const output = {name, height};
console.log(output);

// let glyphExec;
// while (glyphExec = reGlyph.exec(svg)) {
//   const glyph = glyphExec[0];
//   console.log({glyph});

//   const unicode = reUnicode.exec(glyph)?.[1];
//   if(missingErr(unicode, 'unicode in glyph')) break;
//   console.log({unicode});
// }