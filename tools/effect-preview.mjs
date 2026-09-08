/** 攻撃エフェクトの見た目を確かめる。当たっている最中を撮る */
import { chromium } from 'playwright';
const OUT = process.argv[2] ?? '.';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto('http://localhost:4173/');
await page.locator('.mode--sub').click();
await page.getByText('とりあえず ためしたい').click();
await page.getByText('みほんの 12たいを いれる').click();
await page.getByText('もどる').click();
await page.locator('.mode').first().click();
await page.getByText('3たい3').click();
for (const n of ['リザードン','ピカチュウ','カメックス']) await page.getByText(n, { exact: true }).click();
await page.getByText('けってい').click();
await page.getByText('じゅんび できた').click();
for (const n of ['フシギバナ','ゲンガー','ギャラドス']) await page.getByText(n, { exact: true }).click();
await page.getByText('けってい').click();
await page.getByText('コインを なげる').click();
await page.waitForTimeout(1400);
await page.getByText('バトル スタート').click();

let shots = 0;
for (let i = 0; i < 200 && shots < 4; i++) {
  const body = await page.locator('body').innerText();
  if (body.includes('こうげき する！')) { await page.getByText('こうげき する！').click(); continue; }
  if (body.includes('つかれてるよ')) { await page.getByText('これで いく').click(); continue; }
  if (body.includes('メガシンカ できる！')) { await page.getByText('メガシンカ する！').click(); await page.waitForTimeout(2600); continue; }
  if (body.includes('だれで こうげきする')) {
    await page.locator('[data-role=attacker] .card--selectable').first().click({ force: true }); continue;
  }
  if (body.includes('だれを ねらう')) {
    await page.locator('[data-role=target] .card--selectable').first().click({ force: true }); continue;
  }
  if (body.includes('どの わざに する')) { await page.locator('.move-btn').nth(shots % 2).click(); continue; }
  if (body.includes('まんなかで とめよう')) {
    await page.locator('.gauge').click({ force: true });
    shots += 1;
    await page.waitForTimeout(450);            // カットインの まっさいちゅう
    await page.screenshot({ path: `${OUT}/cutin-${shots}.png` });
    await page.waitForTimeout(900);            // 当たって はじけるころ
    await page.screenshot({ path: `${OUT}/impact-${shots}.png` });
    await page.waitForTimeout(900);
    continue;
  }
  if (body.includes('タップして つぎへ')) { await page.locator('.battle-center').click({ force: true }); continue; }
  await page.waitForTimeout(80);
}
await browser.close();
