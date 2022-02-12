// import {parse} from "svg-parser"
import fs      from 'fs'

const svg = fs.readFileSync(
              'fonts/Hershey/HersheyGothEnglish.svg').toString();

// const reGlyphNameAdv = 
//       new RegExp('<glyph\s+?unicode="(.)"\s+?'         +
//                            'glyph-name="(.*?)"\s+?'    +
//                            'horiz-adv-x="(\d+?)"','g');

const reGlyph   = new RegExp(/<glyph\s+?(.*?)\/>/g);
const reUnicode = new RegExp(/unicode="(.)"/);

const output = [];

let glyphExec;
while (glyphExec = reGlyph.exec(svg)) {
  const glyph = glyphExec[0];
  console.log({glyph});

  const unicode = reUnicode.exec(glyph)?.[1];
  if(!unicode) {
    console.log('Error, unicode missing', {glyph});
    break;
  };
  console.log({unicode});
}