/**
 * ゲージの はやさ の せってい（§4）と、
 * つよいわざ の ゲージが ふつうわざ より はやいこと（§3.4）を確かめる。
 *
 *   npm run build && npm run preview &
 *   npm run check:gauge
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

await page.goto('http://localhost:4173/');

// ずかん に みほん を入れておく
await page.locator('.mode--sub').click();
await page.getByText('とりあえず ためしたい').click();
await page.getByText('みほんの 12たいを いれる').click();
await page.getByText('もどる').click();

let settingsShot = false;

/** せってい画面で ゲージの はやさ を えらぶ */
async function setGaugeSpeed(label) {
  await page.locator('.title').click({ delay: 1800 });
  await page.getByText('ゲージの はやさ').waitFor();
  if (!settingsShot) {
    await page.screenshot({ path: `${OUT}/50-settings-gauge.png`, fullPage: true });
    settingsShot = true;
  }
  const field = page.locator('[data-setting=gaugeSpeed]');
  await field.locator('.chip', { hasText: label }).click();
  const on = await field.locator('.chip--on').allInnerTexts();
  await page.getByText('とじる').click();
  return on.some((text) => text.startsWith(label));
}

/** 1vs1 を はじめて、ゲージの マーカーが 1フレームで 何px 動くか はかる */
async function measure(moveIndex) {
  await page.locator('.mode').first().click();
  await page.getByText('1たい1').click();
  await page.getByText('ピカチュウ', { exact: true }).click();
  await page.getByText('けってい').click();
  await page.getByText('じゅんび できた').click();
  await page.getByText('カビゴン', { exact: true }).click();
  await page.getByText('けってい').click();
  await page.getByText('コインを なげる').click();
  await page.waitForTimeout(1500);
  await page.getByText('バトル スタート').click();

  for (let i = 0; i < 200; i += 1) {
    const body = await page.locator('body').innerText();
    if (body.includes('スマホを わたしてね')) { await page.getByText('じゅんび できた').click(); continue; }
    if (body.includes('だれで こうげきする')) {
      await page.locator('[data-role=attacker] .card--selectable').first().click({ force: true });
      continue;
    }
    if (body.includes('だれを ねらう')) {
      await page.locator('[data-role=target] .card--selectable').first().click({ force: true });
      continue;
    }
    if (body.includes('どの わざに する')) { await page.locator('.move-btn').nth(moveIndex).click(); continue; }
    if (body.includes('まんなかで とめよう')) {
      const samples = [];
      for (let t = 0; t < 30; t += 1) {
        samples.push(
          await page.evaluate(() =>
            parseFloat(getComputedStyle(document.querySelector('.gauge__marker')).left)),
        );
        await page.waitForTimeout(30);
      }
      let moved = 0;
      for (let t = 1; t < samples.length; t += 1) moved += Math.abs(samples[t] - samples[t - 1]);
      return moved / (samples.length - 1);
    }
    await page.waitForTimeout(50);
  }
  return null;
}

/** はかったら タイトルに もどす */
async function restart() {
  await page.goto('http://localhost:4173/');
}

const chipOnNormal = await setGaugeSpeed('ふつう');
const normalAtNormal = await measure(0);
await restart();
const strongAtNormal = await measure(1);
await restart();

const chipOnFast = await setGaugeSpeed('はやめ');
const normalAtFast = await measure(0);
await restart();

const summary = {
  chipOnNormal,
  chipOnFast,
  'ふつうわざ・ふつう': normalAtNormal,
  'つよいわざ・ふつう': strongAtNormal,
  'ふつうわざ・はやめ': normalAtFast,
  'つよい / ふつう': strongAtNormal / normalAtNormal,
  'はやめ / ふつう': normalAtFast / normalAtNormal,
  errors,
};
console.log(JSON.stringify(summary, null, 2));
await browser.close();

const ok =
  chipOnNormal && chipOnFast &&
  // つよいわざ は ゲージが はやい
  strongAtNormal > normalAtNormal * 1.15 &&
  // せってい「はやめ」で ゲージが はやくなる
  normalAtFast > normalAtNormal * 1.15 &&
  errors.length === 0;

if (!ok) {
  console.error('ゲージ はやさ の かくにん しっぱい');
  process.exit(1);
}
console.log('ゲージ はやさ の かくにん せいこう');
