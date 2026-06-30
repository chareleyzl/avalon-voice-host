const assert = require('assert');
const fs = require('fs');

const setupJs = fs.readFileSync('pages/setup/setup.js', 'utf8');
const setupWxml = fs.readFileSync('pages/setup/setup.wxml', 'utf8');
const setupWxss = fs.readFileSync('pages/setup/setup.wxss', 'utf8');

assert(!setupJs.includes('ROLE_DESC'), 'setup page should not own duplicated role descriptions');
assert(!setupJs.includes('buildRules()'), 'setup page should not keep obsolete modal rule builder');
assert(!setupJs.includes('showRules'), 'setup page should not keep obsolete rule modal state');
assert(!setupJs.includes('onCloseRules'), 'setup page should not keep obsolete modal close handler');
assert(!setupWxml.includes('rules-overlay'), 'setup page should not keep obsolete rule modal markup');
assert(!setupWxml.includes('rules-modal'), 'setup page should not keep obsolete rule modal markup');
assert(!setupWxss.includes('rules-overlay'), 'setup page should not keep obsolete rule modal styles');
assert(!setupWxss.includes('rules-modal'), 'setup page should not keep obsolete rule modal styles');

console.log('setup cleanup tests passed');
