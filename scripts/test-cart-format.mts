// What goes in which tab, and that splitting a joined cart gives the same parts back.
//
//   node --experimental-strip-types scripts/test-cart-format.mts

import { splitCart, joinCart } from '../src/bridge/cartFormat.ts';
let bad = 0;
const eq = (n: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { bad++; console.log('FAIL', n, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); } else console.log('ok  ', n); };
const stable = (n: string, x: string) => { const a = splitCart(x); const b = splitCart(joinCart(a)); eq('stable: ' + n, b, a); return a; };
const A = '\n\n# <TILES>\n# 001:ec\n# </TILES>\n';
let p = stable('python', '# title: g\n# author: a\n# script:  python\n\ndef TIC():\n cls(2)' + A);
eq('py header', p.header, '# title: g\n# author: a'); eq('py code', p.code, '# script:  python\n\ndef TIC():\n cls(2)'); eq('py assets', p.resources, '# <TILES>\n# 001:ec\n# </TILES>');
p = stable('free comment in header', '# title: g\n# my first game\n\n# saveid\n# script: python\nx=1' + A);
eq('free comment stays in header', p.header, '# title: g\n# my first game\n\n# saveid');
p = stable('metadata-like comment under script', '# title: g\n# script: python\n# desc: paddle game\nx=1');
eq('stays in code', p.code, '# script: python\n# desc: paddle game\nx=1');
p = stable('indented marker mention', '-- script: lua\nx=1\n  -- <MAP> is drawn here\ny=2\n-- <TILES> are nice\nz=3\n\n-- <TILES>\n-- 001:ec\n-- </TILES>');
eq('code not cut', p.code, '-- script: lua\nx=1\n  -- <MAP> is drawn here\ny=2\n-- <TILES> are nice\nz=3');
p = stable('lua, no script line', '-- title: g\n-- author: a\n-- note: mine\nfunction TIC() end\n\n-- <PALETTE>\n-- 000:1a\n-- </PALETTE>');
eq('lua header', p.header, '-- title: g\n-- author: a'); eq('lua code', p.code, '-- note: mine\nfunction TIC() end');
p = stable('non-comment text in header', '# title: g\nhello\n# script: python\nx=1');
eq('goes to code', [p.header, p.code], ['# title: g', 'hello\n# script: python\nx=1']);
p = stable('js', '// title: g\n// script: js\nfunction TIC(){}\n\n// <TILES1>\n// 001:ec\n// </TILES1>');
eq('js', [p.header, p.code], ['// title: g', '// script: js\nfunction TIC(){}']);
p = stable('fennel', ';; title: g\n;; script: fennel\n;; strict: true\n(fn TIC [])\n\n;; <WAVES>\n;; 000:00\n;; </WAVES>');
eq('fennel', [p.header, p.code], [';; title: g', ';; script: fennel\n;; strict: true\n(fn TIC [])']);
p = stable('crlf', '# title: g\r\n# script: python\r\nx=1\r\n\r\n# <SFX>\r\n# 000:00\r\n# </SFX>\r\n');
eq('crlf', [p.header, p.code, p.resources], ['# title: g', '# script: python\nx=1', '# <SFX>\n# 000:00\n# </SFX>']);
for (const [n, x] of [['empty', ''], ['code only', 'x=1'], ['assets only', '-- <TILES>\n-- 001:ec\n-- </TILES>'], ['script only', '# script: python'], ['header only', '# title: g'], ['leading blank', '\n# title: g\n# script: python\nx=1']] as const) stable(n, x);
// the reported cycle: header tab keeps a stale copy and sends it back
let parts = splitCart('# title: g\n# script: python\nx=1');
for (let i = 0; i < 3; i++) { parts = { ...parts, header: parts.header + '' }; const stale = '# title: g\n# my first game'; parts = splitCart(joinCart({ ...parts, header: stale })); }
eq('no duplication over cycles', parts, { header: '# title: g\n# my first game', code: '# script: python\nx=1', resources: '' });
console.log(bad ? bad + ' FAILED' : 'ALL GREEN'); process.exit(bad ? 1 : 0);
