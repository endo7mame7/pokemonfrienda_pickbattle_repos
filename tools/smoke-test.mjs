/**
 * 通しのスモークテスト。
 * iPhone SE（375x667）の画面で 3vs3 を最後まで自動プレイし、
 * こうかばつぐん・つかれ・メガシンカが出ること、画面がはみ出さないことを確かめる。
 *
 *   npm run build && npm run preview &   # http://localhost:4173 で配信しておく
 *   npm run smoke
 *
 * 環境によっては Chromium の場所を指定する:
 *   CHROMIUM_PATH=/path/to/chrome npm run smoke
 */
import { chromium } from 'playwright';

const SHOTS = process.argv[2] ?? 'smoke-shots';
const executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
// iPhone SE（いちばん狭い想定）
const ctx = await browser.newContext({
  viewport: { width: 375, height: 667 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });
const tap = async (text) => { await page.getByText(text, { exact: false }).first().click(); };

await page.goto('http://localhost:4173/');
await shot('01-title');

await tap('バトルを はじめる');
await shot('02-teamsize');

const SIZE = Number(process.env.TEAM_SIZE ?? 3);
await page.getByText(`${SIZE}たい${SIZE}`).click();
// あかチーム
for (const name of ['リザードン', 'ピカチュウ', 'カビゴン'].slice(0, SIZE)) {
  await page.getByText(name, { exact: true }).click();
}
await shot('03-selectteam');
await page.getByText('けってい').click();

await tap('じゅんび できた');
for (const name of ['フシギバナ', 'ゲンガー', 'ギャラドス'].slice(0, SIZE)) {
  await page.getByText(name, { exact: true }).click();
}
await page.getByText('けってい').click();

await shot('04-cointoss');
await page.getByText('モンスターボール').click();
await page.waitForTimeout(1500);
await shot('05-cointoss-result');
await page.getByText('バトル スタート').click();

await shot('06-battle-start');

// バトルを最後まで自動で進める
let turns = 0;
let sawSuperEffective = false, sawTired = false, sawMega = false, shotBattle = false;
let shotMegaPrompt = false, shotMegaAnim = false;
while (turns < 400) {
  turns += 1;
  const body = await page.locator('body').innerText();

  if (body.includes('の かち！')) break;

  if (body.includes('つかれてるよ')) { await page.getByText('これで いく').click(); continue; }
  if (body.includes('メガシンカ できる！')) {
    if (!shotMegaPrompt) { await shot('07-mega-prompt'); shotMegaPrompt = true; }
    await page.getByText('メガシンカ する！').click();
    sawMega = true;
    await page.waitForTimeout(1900);
    if (!shotMegaAnim) { await shot('08-mega-anim'); shotMegaAnim = true; }
    await page.waitForTimeout(1000);
    continue;
  }
  if (body.includes('スマホを わたしてね')) { await page.getByText('じゅんび できた').click(); continue; }
  if (body.includes('ばつぐん！')) sawSuperEffective = true;
  if (body.includes('つかれて はんぶん')) sawTired = true;

  if (body.includes('だれで こうげきする')) {
    const cards = page.locator('.card--selectable');
    await cards.first().click({ force: true });
    continue;
  }
  if (body.includes('だれを ねらう')) {
    if (!shotBattle) { await shot('07-battle-select'); }
    const cards = page.locator('.card--selectable');
    await cards.first().click({ force: true });
    continue;
  }
  if (body.includes('サイコロを ふろう')) { await page.locator('.dice-button').click({ force: true }); await page.waitForTimeout(900); continue; }
  if (body.includes('タップして つぎへ')) { await page.locator('.battle-center').click({ force: true }); continue; }

  await page.waitForTimeout(120);
}

await shot('09-result');
const finalBody = await page.locator('body').innerText();

// 横スクロールが出ていないこと（画面がはみ出していないこと）
const overflow = await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);

// 縦にはみ出していないか（画面内にすべて収まっているか）
const verticalOverflow = await page.evaluate(() =>
  document.documentElement.scrollHeight - document.documentElement.clientHeight);

const summary = {
  decided: finalBody.includes('の かち！'),
  loops: turns,
  sawSuperEffective,
  sawTired,
  sawMega,
  horizontalOverflowPx: overflow,
  verticalOverflowPx: verticalOverflow,
  errors,
};

console.log(`--- ${SIZE}vs${SIZE} ---`);
console.log(JSON.stringify(summary, null, 2));
await browser.close();

// 1vs1 では、こうかばつぐんやメガシンカが出ないこともある
const strict = SIZE >= 3;
const ok =
  summary.decided &&
  (!strict || (summary.sawSuperEffective && summary.sawTired && summary.sawMega)) &&
  summary.horizontalOverflowPx === 0 &&
  summary.verticalOverflowPx === 0 &&
  summary.errors.length === 0;

if (!ok) {
  console.error('スモークテスト しっぱい');
  process.exit(1);
}
console.log('スモークテスト せいこう');
