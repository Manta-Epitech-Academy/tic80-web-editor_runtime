// TIC-80 must start whatever the pixel ratio of the screen. At one that is not a round value
// (a browser zoom of 90% or 110%, some display scalings) SDL used to read its own 1x1 test
// canvas as 0 pixels wide, and the first frame threw "The source width is zero".
//
//   npm run build && npx vite preview &
//   node scripts/test-boot-zoom.mjs            (TEST_URL to point elsewhere)
import { chromium } from 'playwright';

const URL = process.env.TEST_URL ?? 'http://localhost:4173/';
const SCALES = ['1', '1.25', '0.67', '0.8', '0.9', '1.1'];

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : `\n     ${detail}`}`);
  if (!ok) failures++;
}

for (const scale of SCALES) {
  // The pixel ratio of the whole browser, as a zoom or a display scaling sets it. Playwright's
  // deviceScaleFactor is an emulation and does not measure the canvas the same way.
  const browser = await chromium.launch({
    headless: true,
    args: [`--force-device-scale-factor=${scale}`],
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  const pageErrors = [];
  // Emscripten leaves its main loop by throwing 'unwind': that one is how TIC-80 starts.
  page.on('pageerror', (err) => {
    if (err.message !== 'unwind') pageErrors.push(err.message);
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('.tic-start-button').click();
  await page.waitForTimeout(5000);

  const canvas = await page.evaluate(() => {
    const el = document.getElementById('canvas');
    return { width: el.width, height: el.height };
  });
  check(
    `pixel ratio ${scale}: TIC-80 has a screen`,
    canvas.width > 1 && canvas.height > 1,
    `canvas is ${canvas.width}x${canvas.height}`,
  );
  check(`pixel ratio ${scale}: no page error`, pageErrors.length === 0, pageErrors.join('\n     '));

  await browser.close();
}

process.exit(failures ? 1 : 0);
