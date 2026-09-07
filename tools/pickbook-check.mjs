/**
 * ずかん（P2）の確認。
 * 実物ピックの写真をとって登録し、アプリを開き直しても残っていること、
 * バトルのカードにも写真が出ることを確かめる。
 *
 *   npm run build && npm run preview &
 *   npm run check:pickbook
 *
 * 環境によっては CHROMIUM_PATH=/path/to/chrome を付ける。
 */
import { chromium } from 'playwright';

const SHOTS = process.argv[2] ?? 'smoke-shots';
const PHOTO = 'public/icon-512.png'; // 写真のかわりに使う画像
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
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

await page.goto('http://localhost:4173/');

// --- とうろく ---
await page.locator('.mode--sub').click();
await page.getByText('＋ とうろく').click();
await shot('20-form-empty');

await page.setInputFiles('input[type=file]', PHOTO);
await page.waitForTimeout(400);
await page.locator('#pick-name').fill('マイピカチュウ');
await page.getByText('でんき', { exact: true }).click();
await page.getByText('250', { exact: true }).click();
// 「メガシンカ できない」を押すと できる に変わる（トグルの確認）
await page.getByText('メガシンカ できない').click();
const megaLabel = await page.locator('.toggle').innerText();
await shot('21-form-filled');
await page.getByText('ほぞん').click();
await page.waitForTimeout(500);
await shot('22-pickbook');

const afterSave = await page.evaluate(() => ({
  cards: document.querySelectorAll('.pick-item').length,
  photos: document.querySelectorAll('.pick-item img.face-photo').length,
}));

// --- 保存された中身をデータベースで確かめる ---
const stored = await page.evaluate(async () => {
  const open = indexedDB.open('pickbattle');
  const db = await new Promise((res, rej) => {
    open.onsuccess = () => res(open.result);
    open.onerror = () => rej(open.error);
  });
  const rows = await new Promise((res, rej) => {
    const req = db.transaction('picks').objectStore('picks').getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return rows.map((r) => ({
    name: r.name, type: r.type, energy: r.energy,
    mega: r.canMegaEvolve,
    photoType: r.photo?.type ?? null,
    photoKB: r.photo ? Math.round(r.photo.size / 1024) : null,
  }));
});

// --- 開き直しても残っているか（いちばん大事） ---
await page.reload();
await page.waitForTimeout(700);
await page.locator('.mode--sub').click();
await page.waitForTimeout(400);
const afterReload = await page.evaluate(() => ({
  cards: document.querySelectorAll('.pick-item').length,
  photos: document.querySelectorAll('.pick-item img.face-photo').length,
  title: document.querySelector('.pick-item .card__name')?.textContent ?? null,
}));

// --- バトルのカードにも写真が出るか ---
await page.getByText('とりあえず ためしたい').count().catch(() => 0);
await page.getByText('もどる').click();
await page.locator('.mode').first().click();
await page.getByText('1たい1').click();
await page.getByText('マイピカチュウ', { exact: true }).click();
await page.getByText('けってい').click();
await page.getByText('じゅんび できた').click();
await page.getByText('マイピカチュウ', { exact: true }).click();
await page.getByText('けってい').click();
await page.getByText('コインを なげる').click();
await page.waitForTimeout(1400);
await page.getByText('バトル スタート').click();
await page.waitForTimeout(300);
await shot('23-battle-with-photo');
const battlePhotos = await page.locator('.card img.face-photo').count();

const summary = { afterSave, stored, megaLabel, afterReload, battlePhotos, errors };
console.log(JSON.stringify(summary, null, 2));
await browser.close();

const ok =
  afterSave.cards === 1 && afterSave.photos === 1 &&
  stored.length === 1 &&
  stored[0].name === 'マイピカチュウ' && stored[0].type === 'でんき' &&
  stored[0].energy === 250 && stored[0].mega === true &&
  megaLabel.includes('メガシンカ できる') &&
  stored[0].photoType === 'image/jpeg' && stored[0].photoKB > 0 && stored[0].photoKB < 300 &&
  afterReload.cards === 1 && afterReload.photos === 1 &&
  afterReload.title === 'マイピカチュウ' &&
  battlePhotos === 2 &&
  errors.length === 0;

if (!ok) {
  console.error('ずかんの かくにん しっぱい');
  process.exit(1);
}
console.log('ずかんの かくにん せいこう');
