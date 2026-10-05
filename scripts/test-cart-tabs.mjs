// The cart is one file for TIC-80 and three tabs for the person editing it. This checks both
// halves in a real browser: what each tab shows, and that the file TIC-80 holds is still whole.
//
//   npm run build && npx vite preview &
//   node scripts/test-cart-tabs.mjs            (TEST_URL to point elsewhere)
import { chromium } from 'playwright';

const URL = process.env.TEST_URL ?? 'http://localhost:4173/';

const CART = `# title:   Pong
# author:  someone
# desc:    a test cart
# version: 0.1
# script:  python

# note: my own comment
def TIC():
 cls(2)

# <TILES>
# 001:eccccccccc888888caaaaaaaca888888cacccccccacc0ccccacc0ccccacc0ccc
# </TILES>

# <PALETTE>
# 000:1a1c2c5d275db13e53ef7d57ffcd75a7f07038b76425717929366f3b5dc941a6f673eff7f4f4f494b0c2566c86333c57
# </PALETTE>
`;

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : `\n     ${detail}`}`);
  if (!ok) failures++;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
const pageErrors = [];
// Emscripten leaves its main loop by throwing 'unwind': that one is how TIC-80 starts.
page.on('pageerror', (err) => {
  if (err.message !== 'unwind') pageErrors.push(err.message);
});

const part = (name) =>
  page.evaluate(
    (n) => window.monaco.editor.getModels().find((m) => m.uri.path.endsWith(`cart-${n}`))?.getValue() ?? null,
    name,
  );
const savedCart = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('tic80-web-editor-cart') ?? 'null')?.text ?? '');
const ticCart = () =>
  page.evaluate(() => {
    const mod = window.Module;
    const lenPtr = mod._malloc(4);
    const text = mod.UTF8ToString(mod._tic80_cart_export(lenPtr));
    mod._free(lenPtr);
    return text;
  });
const tab = (title) => page.locator('.dv-default-tab', { hasText: title });
const activeTab = () => page.locator('.dv-tab.dv-active-tab', { hasText: /Editor|Header|Assets/ }).innerText();

try {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('.tic-start-button').click();
  await page.locator('button:has-text("Load Code"):not([disabled])').waitFor({ timeout: 60_000 });

  for (const title of ['Editor', 'Header', 'Assets']) {
    check(`there is a "${title}" tab`, (await tab(title).count()) === 1);
  }
  check('the editor is the tab in front', (await activeTab()).trim() === 'Editor');

  await page.locator('input.app-toolbar-file').setInputFiles({
    name: 'pong.py',
    mimeType: 'text/plain',
    buffer: Buffer.from(CART),
  });
  await page.waitForFunction(() =>
    window.monaco?.editor.getModels().some((m) => m.uri.path.endsWith('cart-code') && m.getValue().includes('def TIC')),
  );

  const code = await part('code');
  check('the code starts with the script line', code.startsWith('# script:  python\n'), code);
  check('the code holds no other header line', !/title:|author:|desc:|version:/.test(code), code);
  check('the code holds no asset section', !/<TILES>|<PALETTE>/.test(code), code);
  check("the author's own comment stays with the code", code.includes('# note: my own comment'), code);

  await tab('Header').click();
  await page.waitForFunction(() => window.monaco.editor.getModels().some((m) => m.uri.path.endsWith('cart-header')));
  const header = await part('header');
  check('the header tab holds the metadata', /^# title: {3}Pong\n# author: {2}someone\n# desc: {4}a test cart\n# version: 0\.1$/.test(header), header);

  await tab('Assets').click();
  await page.waitForFunction(() => window.monaco.editor.getModels().some((m) => m.uri.path.endsWith('cart-resources')));
  const assets = await part('resources');
  check('the assets tab holds the sections', assets.startsWith('# <TILES>') && assets.trimEnd().endsWith('# </PALETTE>'), assets);

  // Typing: in the code, at the very end, then a new line. The new line must survive (the tab
  // is not handed back a trimmed copy), and the file TIC-80 holds must still have all its parts.
  await tab('Editor').click();
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n# end', { delay: 20 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('x', { delay: 20 });
  await page.waitForTimeout(1500);
  const typed = await part('code');
  check('a line added at the end of the code stays as typed', /cls\(2\)\n\s*# end\n\s*x$/.test(typed), JSON.stringify(typed.slice(-40)));

  const fromTic = await ticCart();
  check('TIC-80 holds the header', fromTic.includes('# title:   Pong'), fromTic.slice(0, 200));
  check('TIC-80 holds the new code', fromTic.includes('# end'), fromTic);
  check('TIC-80 holds the assets', fromTic.includes('# <TILES>') && fromTic.includes('# 001:ecccccccc'), fromTic);
  check('in the file, the header comes first and the script line follows', /^# title:[\s\S]*\n# version: 0\.1\n# script: {2}python\n/.test(fromTic), fromTic.slice(0, 200));

  // The header is edited in its own tab and lands in the same file.
  await tab('Header').click();
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('End');
  await page.keyboard.type(' 2', { delay: 20 });
  await page.waitForTimeout(1800);
  const saved = await savedCart();
  check('the saved cart has the edited header', saved.startsWith('# title:   Pong 2\n'), saved.slice(0, 80));
  check('the saved cart is the whole file', saved.includes('# script:  python') && saved.includes('def TIC') && saved.includes('# <PALETTE>'), saved);
  check('TIC-80 holds the edited header', (await ticCart()).includes('# title:   Pong 2'));

  // A line of one's own in the header, then TIC-80 hands the cart back (as `save` does), then one
  // more keystroke there: the line must be in the file once, and stay in the header.
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n# my first game', { delay: 20 });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.Module.onCartChanged(2));
  await page.waitForTimeout(600);
  await page.keyboard.type('!', { delay: 20 });
  await page.waitForTimeout(1800);
  const once = await savedCart();
  check('a comment added in the header is in the file once', once.split('# my first game').length === 2, once.slice(0, 200));
  check('and it is still in the header', (await part('header')).endsWith('# my first game!'), await part('header'));
  check('the code did not receive it', !(await part('code')).includes('my first game'), await part('code'));

  // Loading the same file again is how one starts over: the editor must show the file, not what
  // had been typed over it.
  await tab('Editor').click();
  await page.waitForFunction(() => window.monaco.editor.getModels().some((m) => m.uri.path.endsWith('cart-code')));
  for (let i = 0; i < 2; i++) {
    await page.locator('input.app-toolbar-file').setInputFiles({ name: 'pong.py', mimeType: 'text/plain', buffer: Buffer.from(CART) });
    await page.waitForTimeout(500);
    if (i === 0) {
      await page.locator('.monaco-editor').first().click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type('\n# typed over', { delay: 20 });
      await page.waitForTimeout(300);
    }
  }
  const reset = await part('code');
  check('loading the same file again shows the file', !reset.includes('typed over') && reset.endsWith('cls(2)'), JSON.stringify(reset.slice(-40)));
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n# end', { delay: 20 });
  await tab('Assets').click();
  await page.waitForTimeout(1500);

  // A reload restores the autosaved file, split the same way.
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.tic-start-button').click();
  await page.waitForFunction(
    () => window.monaco?.editor.getModels().some((m) => m.getValue().includes('def TIC')),
    null,
    { timeout: 60_000 },
  );
  check('the editor is in front again, though Assets was when the page was left', (await activeTab()).trim() === 'Editor');
  await page.waitForFunction(() => window.monaco.editor.getModels().some((m) => m.uri.path.endsWith('cart-code')));
  const again = await part('code');
  check('after a reload the code is back, without header or assets', again.startsWith('# script:  python\n') && again.includes('# end') && !/title:|<TILES>/.test(again), again);

  if (process.env.SHOT) {
    await page.screenshot({ path: process.env.SHOT });
  }
  check('no page error', pageErrors.length === 0, pageErrors.join('\n'));
} catch (error) {
  check('the test ran to its end', false, error instanceof Error ? error.message : String(error));
}

await browser.close();
console.log(failures ? `${failures} FAILED` : 'ALL GREEN');
process.exit(failures ? 1 : 0);
