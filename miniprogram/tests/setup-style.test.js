const assert = require('assert');
const fs = require('fs');

const setupWxss = fs.readFileSync('pages/setup/setup.wxss', 'utf8');

assert(setupWxss.includes('.num-select'));
assert(/\.num-select\s*\{[^}]*margin-top:\s*10px;/.test(setupWxss));

console.log('setup style tests passed');
