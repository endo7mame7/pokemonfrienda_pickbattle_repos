/**
 * タイミング方式のバトルを通しで確かめる。
 * わざ えらび → ゲージ → こうげき が動き、最後まで決着すること、
 * 画面がはみ出さないことを見る。
 *
 *   npm run build && npm run preview &
 *   npm run check:timing
 */
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? 'smoke-shots';
const SIZE = Number(process.env.TEAM_SIZE ?? 3);
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
await page.locator('.mode--sub').click();
await page.getByText('とりあえず ためしたい').click();
await page.getByText('みほんの 12たいを いれる').click();
await page.getByText('もどる').click();
await page.locator('.mode').first().click();
await page.getByText(`${SIZE}たい${SIZE}`).click();
for (const n of ['リザードン', 'ピカチュウ', 'カメックス'].slice(0, SIZE)) {
  await page.getByText(n, { exact: true }).click();
}
await page.getByText('けってい').click();
await page.getByText('じゅんび できた').click();
for (const n of ['フシギバナ', 'ゲンガー', 'ギャラドス'].slice(0, SIZE)) {
  await page.getByText(n, { exact: true }).click();
}
await page.getByText('けってい').click();
await page.getByText('コインを なげる').click();
await page.waitForTimeout(1500);
await page.getByText('バトル スタート').click();

const seen = { perfect: false, near: false, miss: false, strong: false, normal: false };
let rounds = 0;
let decided = false;
let shotMove = false;
let shotGauge = false;
let shotResult = false;

for (let i = 0; i < 900; i += 1) {
  const body = await page.locator('body').innerText();
  if (body.includes('の かち！')) { decided = true; break; }

  // 手番が変わったら スマホを わたす
  if (body.includes('スマホを わたしてね')) { await page.getByText('じゅんび できた').click(); continue; }
  if (body.includes('つかれてるよ')) { await page.getByText('これで いく').click(); continue; }
  if (body.includes('メガシンカ できる！')) {
    await page.getByText('メガシンカ する！').click();
    await page.waitForTimeout(2600);
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
    if (!shotMove) { await shot('30-choose-move'); shotMove = true; }
    // つよい と ふつう を かわりばんこに ためす
    const index = rounds % 2;
    seen[index === 0 ? 'normal' : 'strong'] = true;
    await page.locator('.move-btn').nth(index).click();
    rounds += 1;
    continue;
  }
  if (body.includes('まんなかで とめよう')) {
    if (!shotGauge) { await shot('31-gauge'); shotGauge = true; }
    await page.locator('.gauge').click({ force: true });
    await page.waitForTimeout(2400); // カットイン + 飛んで 当たる まで
    continue;
  }
  if (body.includes('タップして つぎへ')) {
    if (body.includes('ぴったり')) seen.perfect = true;
    if (body.includes('ちかい')) seen.near = true;
    if (body.includes('はずれ')) seen.miss = true;
    if (!shotResult) { await shot('32-result'); shotResult = true; }
    await page.locator('.battle-center').click({ force: true });
    continue;
  }
  await page.waitForTimeout(80);
}

await shot('33-finish');
const overflow = await page.evaluate(() => ({
  x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
}));

const summary = { size: SIZE, decided, waza: rounds, seen, overflow, errors };
console.log(JSON.stringify(summary, null, 2));
await browser.close();

const ok =
  decided &&
  seen.normal && seen.strong &&
  (seen.perfect || seen.near || seen.miss) &&
  overflow.x === 0 && overflow.y === 0 &&
  errors.length === 0;

if (!ok) {
  console.error('タイミング方式の かくにん しっぱい');
  process.exit(1);
}
console.log('タイミング方式の かくにん せいこう');
