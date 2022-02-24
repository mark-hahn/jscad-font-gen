import fs        from 'fs'
import {getSystemErrorMap} from 'util';
import yargs     from 'yargs'
import {hideBin} from 'yargs/helpers'

// import fonts     from './fonts/jscad-fonts.js'
// console.log(fonts.EMSSpaceRocks);

//////////  PROCESS COMMAND-LINE OPTIONS  ///////////
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

//////////////  FIND FILE PATHS  //////////////

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

//////////  REGEX UTILITIES  ///////////

const exec1 = (regex, str, name, dbgOk=false, dbgErr=true) => {
  const groups = regex.exec(str);
  if(groups) {
    if(!groups[1]) {
      if(dbgErr) console.log(`Error: "${name}" missing group[1]: ${{groups}}`);
      return null;
    }
    if(groups[2]) {
      if(dbgErr) console.log(`Error: "${name}" has too many groups: ${{groups}}`);
      return null;
    }
    if(dbgOk) console.log(`${name}: "${groups[1]}"`);
    return groups[1];
  }
  if(dbgErr) console.log(`Error: "${name}" missing regex ${regex} from ` +
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

// const createRegExp = (str, opts) => 
//     new RegExp(str.raw[0].replace(/\s/gm, ""), opts || "");
// const rePoint = createRegExp`[\s,]*? ([\d\.-]+) 
//                              [\s,]+  ([\d\.-]+) ${'igs'}`;

const reName    = new RegExp(/<font.*?id="(.+?)".*?[<>]/is);
const reHeight  = new RegExp(/<font-face.*?cap-height="(\d*?)".*?\/>/is);
const reGlyph   = new RegExp(/<glyph\s+?(.*?)\/>/igs);
const reUnicode = new RegExp(/unicode="(.)"/i);
const reHAdvX   = new RegExp(/horiz-adv-x="([\d\.]*?)"/is);
const rePath    = new RegExp(/d="(.*?)"/igs);
const reMoveAbs = new RegExp(/[\s,]*?M/gs);
const reMoveRel = new RegExp(/[\s,]*?m/gs);
const reLineAbs = new RegExp(/[\s,]*?L/gs);
const reLineRel = new RegExp(/[\s,]*?l/gs);
const reCurvAbs = new RegExp(/[\s,]*?C/gs);
const reCurvRel = new RegExp(/[\s,]*?c/gs);
const rePoint   = new RegExp(/[\s,]*?([\d\.-]+)[\s,]+([\d\.-]+)/igs);

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

    output += `\n/* ${unicode} */ ` +
              `${unicode.charCodeAt(0).toString().padStart(3)}:`;
              
    output += `[${exec1(reHAdvX, glyph, 'horiz-adv-x', true)},`;

    const path = exec1(rePath, glyph, 'path', true, false);
    if(path) {
/*
const reMoveAbs = new RegExp(/[\s,]*?M/igs);
const reMoveRel = new RegExp(/[\s,]*?m/igs);
const reLineAbs = new RegExp(/[\s,]*?L/igs);
const reLineRel = new RegExp(/[\s,]*?l/igs);
const reCurvAbs = new RegExp(/[\s,]*?C/gs);
const reCurvRel = new RegExp(/[\s,]*?c/gs);
const rePoint   = new RegExp(/[\s,]*?([\d\.-]+)[\s,]+([\d\.-]+)/igs);
*/
      let state = 'startPath';
      reMoveAbs.lastIndex = 0; reMoveRel.lastIndex = 0;
      reLineAbs.lastIndex = 0; reLineRel.lastIndex = 0;
      reCurvAbs.lastIndex = 0; reCurvRel.lastIndex = 0;
      rePoint  .lastIndex = 0;

      let lastX = 0, lastY = 0, lastRePos = 0;;

      let moveAbs = null, moveRel = null, 
          lineAbs = null, lineRel = null, 
          curvAbs = null, curvRel = null, 
          point = null;  
      while ((moveAbs = exec(reMoveAbs, path, 'moveAbs', true, false)) ||
             (moveRel = exec(reMoveRel, path, 'moveRel', true, false)) ||
             (lineAbs = exec(reLineAbs, path, 'lineAbs', true, false)) ||
             (lineRel = exec(reLineRel, path, 'lineRel', true, false)) ||
             (curvAbs = exec(reCurvAbs, path, 'curvAbs', true, false)) ||
             (curvRel = exec(reCurvRel, path, 'curvRel', true, false)) ||
             (point   = exec(rePoint,   path, 'point',   true)) ) {
        if(moveAbs) {
          rePoint.lastIndex = reMoveAbs.lastIndex;
          if(state != 'startPath')
            output += `, `; // double commas start segment
          const pnt = exec(rePoint, path, 'point', true);
          lastX = +pnt[1]; lastY = +pnt[2];
          output += `${lastX},${lastY}, `; 
          lastPathIdx = rePoint.lastIndex;
          state = 'movedAbs';
        }
        else if(moveRel) {
          rePoint.lastIndex = reMoveRel.lastIndex;
          const pnt = exec(rePoint, path, 'point', true, false);
          if(state == 'startPath') {
            lastX  = +pnt[1]; lastY  = +pnt[2];
          } else { 
            output += `, `; // double commas start segment
            lastX += +pnt[1]; lastY += +pnt[2];
          }
          output += `${lastX},${lastY}, `; 
          lastPathIdx = rePoint.lastIndex;
          state = 'movedRel';
        }
        else if(lineAbs) {
          rePoint.lastIndex = reLineAbs.lastIndex;
          const pnt = exec(rePoint, path, 'point', true, false);
          lastX = +pnt[1]; lastY = +pnt[2];
          output += `${lastX},${lastY}, `; 
          lastPathIdx = rePoint.lastIndex;
          state = 'lineAbs';
        }
        else if(lineRel) {
          rePoint.lastIndex = reLineRel.lastIndex;
          const pnt = exec(rePoint, path, 'point', true, false);
          lastX += +pnt[1]; lastY += +pnt[2];
          output += `${lastX},${lastY}, `; 
          lastPathIdx = rePoint.lastIndex;
          state = 'lineRel';
        }
        // TODO -- handle curves
        else if(point) {
          if(state == 'lineAbs'){
            lastX = +point[1]; lastY = +point[2];
          }
          else if(state == 'lineRel'){
            lastX += +point[1]; lastY += +point[2];
          }
          output += `${lastX},${lastY}, `; 
          lastPathIdx = rePoint.lastIndex;
        }




      rePoint.lastIndex  = 0;
      reBezier.lastIndex = 0;
      let lastX = 0;
      let lastY = 0;
      let point = null, bezier = null;
      while ((point  = exec(rePoint,  path, 'point',  false, false)) ||
             (bezier = exec(reBezier, path, 'bezier', false, false)) ) {
        if(!point && !bezier) {
          console.log('Error: unknown path command: ', path.slice(0,10));
          system.exit();
        }
        // console.log('while: ', {point,bezier});
        let m,x1,y1,x2,y2,x,y;
        if(point) {
          [,m,x,y] = point;
          console.log('point:',{m,x,y});
          x = parseInt(x); y = parseInt(y);
          if(m == m.toLowerCase()){
            m = m.toUpperCase();
            x += lastX; y += lastY;
          }
          else output += `,`;
          reBezier.lastIndex = rePoint.lastIndex;
        } 
        else {
          [,m,x1,y1,x2,y2,x,y] = bezier;
          console.log('bezier:',{m,x1,y1,x2,y2,x,y});
          x1 = parseInt(x1); y1 = parseInt(y1);
          x2 = parseInt(x2); y2 = parseInt(y2);
          x  = parseInt(x);  y  = parseInt(y);
          if(m == m.toLowerCase()){
            m = m.toUpperCase();
            x += lastX; y += lastY;
          }
          else output += ` cap ,`;
          rePoint.lastIndex = reBezier.lastIndex;
        }// 9,30 27,71 62,71 46,0 49,-72 49,-100 
        point = null; bezier = null;
        lastX = x;    lastY  = y;
        switch(m) {
          case 'M': case 'L': output += `${x},${y},`; break;
          case 'C': 
            // bezier
            output += ` bezier ${x1},${y1},  ${x2},${y2},  ${x},${y}, `; break;
        }
      }




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
