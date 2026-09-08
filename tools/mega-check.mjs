/**
 * メガシンカの見た目と メガわざ（れんだ）を確かめる。
 *
 *   npm run build && npm run preview &
 *   npm run check:mega
 *
 * たいりょくの ひくい ピックで 1vs1 にして、すぐ メガシンカ できる状態にする。
 */
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? 'smoke-shots';
const executablePath = process.env.CHROMIUM_PATH;

const browser = await chromium.launch(executablePath ? { executablePath } : {});
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
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

await page.goto('http://localhost:4173/');

// メガシンカ を出しやすくするため「はんぶん」で発動させる
await page.locator('.title').click({ delay: 1800 });
await page.getByText('はんぶん', { exact: true }).click();
await page.getByText('とじる').click();

await page.locator('.mode--sub').click();
await page.getByText('とりあえず ためしたい').click();
await page.getByText('みほんの 12たいを いれる').click();
await page.getByText('もどる').click();
await page.locator('.mode').first().click();
await page.getByText('1たい1').click();
// メガシンカ できて たいりょくが ひくい子
await page.getByText('サーナイト', { exact: true }).click();
await page.getByText('けってい').click();
await page.getByText('じゅんび できた').click();
await page.getByText('サーナイト', { exact: true }).click();
await page.getByText('けってい').click();
await page.getByText('コインを なげる').click();
await page.waitForTimeout(1500);
await page.getByText('バトル スタート').click();

let sawPrompt = false;
let sawMegaMove = false;
let mashFill = null;
let megaAuraInCard = 0;

for (let i = 0; i < 400 && mashFill === null; i += 1) {
  const body = await page.locator('body').innerText();
  if (body.includes('の かち！')) break;

  if (body.includes('こうげき する！')) { await page.getByText('こうげき する！').click(); continue; }
  if (body.includes('つかれてるよ')) { await page.getByText('これで いく').click(); continue; }
  if (body.includes('メガシンカ できる！')) {
    sawPrompt = true;
    await shot('40-mega-prompt');
    await page.getByText('メガシンカ する！').click();
    await page.waitForTimeout(1500);
    await shot('41-mega-animation');
    await page.waitForTimeout(1200);
    // カードの かげ が つよそうな すがた に変わっているか
    megaAuraInCard = await page.locator('.card--mega svg polygon').count();
    await shot('42-mega-card');
    continue;
  }
  if (body.includes('だれで こうげきする')) {
    await page.locator('[data-role=attacker] .card--selectable').first().click({ force: true });
    continue;
  }
  if (body.includes('だれを ねらう')) {
    await page.locator('[data-role=target] .card--selectable').first().click({ force: true });
    continue;
  }
  if (body.includes('どの わざに する')) {
    const mega = page.locator('.move-btn--mega');
    if (await mega.count()) {
      sawMegaMove = true;
      await shot('43-move-choice-with-mega');
      await mega.click();
    } else {
      await page.locator('.move-btn').nth(1).click();
    }
    continue;
  }
  if (body.includes('れんだ！')) {
    // れんだ してゲージをためる
    for (let t = 0; t < 24; t += 1) {
      await page.locator('.mash__button').click({ force: true });
      if (t === 8) await shot('44-mash');
    }
    await shot('45-mash-max');
    await page.waitForTimeout(3200);
    continue;
  }
  if (body.includes('まんなかで とめよう')) {
    await page.locator('.gauge').click({ force: true });
    await page.waitForTimeout(1300);
    continue;
  }
  if (body.includes('タップして つぎへ')) {
    const m = body.match(/ゲージ (\d+)%|MAX/);
    if (m) { mashFill = m[0]; await shot('46-mash-result'); }
    await page.locator('.battle-center').click({ force: true });
    continue;
  }
  await page.waitForTimeout(80);
}

const overflow = await page.evaluate(() => ({
  x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
}));

const summary = { sawPrompt, sawMegaMove, megaAuraInCard, mashResult: mashFill, overflow, errors };
console.log(JSON.stringify(summary, null, 2));
await browser.close();

const ok =
  sawPrompt && sawMegaMove &&
  megaAuraInCard > 0 &&          // かげが つよそうな すがた に変わっている
  mashFill !== null &&           // れんだ の結果が出た
  overflow.x === 0 && overflow.y === 0 &&
  errors.length === 0;

if (!ok) {
  console.error('メガシンカの かくにん しっぱい');
  process.exit(1);
}
console.log('メガシンカの かくにん せいこう');
