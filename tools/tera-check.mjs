/**
 * テラスタル（docs/SPEC.md §3.11）を通しで確かめる。
 *
 *   npm run build && npm run preview &
 *   npm run check:tera
 *
 * 見るところ:
 *  - 毎ターン きかれない。💎 ボタンを おしたときだけ えらぶ画面が 出る
 *  - せんよう カットイン が出て、かげ に けっしょう が つく
 *  - ゲージが うんと ゆっくりになる（1往復の じかん を はかる）
 *  - テラスタルわざ が あいて ぜんいん に あたり、ダメージが 等分される
 *  - バトルで 1回だけ（つかったら ボタンが 消える）
 *  - テラスタルした子は こうげきの つぎの ターンは やすみ（⏸・えらべない）
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

/**
 * ゲージが 1往復する じかん（ms）を、ページの中から はかる。
 * テラスタル中は 1往復 3秒ちかく かかるので、まど を ながめ に とる。
 * おりかえし が 2回 あれば 半おうふく が わかる。
 */
async function cycleMs() {
  const samples = await page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const marker = document.querySelector('.gauge__marker');
        const out = [];
        const start = performance.now();
        const tick = () => {
          const now = performance.now() - start;
          out.push([now, parseFloat(getComputedStyle(marker).left)]);
          if (now < ms) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
    7000,
  );
  const turns = [];
  for (let t = 1; t < samples.length - 1; t += 1) {
    const before = samples[t][1] - samples[t - 1][1];
    const after = samples[t + 1][1] - samples[t][1];
    if (before !== 0 && after !== 0 && Math.sign(before) !== Math.sign(after)) turns.push(samples[t][0]);
  }
  if (turns.length < 2) return null;
  return Math.round(((turns[turns.length - 1] - turns[0]) / (turns.length - 1)) * 2);
}

await page.goto('http://localhost:4173/');
await page.locator('.mode--sub').click();
await page.getByText('とりあえず ためしたい').click();
await page.getByText('みほんの 12たいを いれる').click();
await page.getByText('もどる').click();

// 3vs3。たいりょくの 多い子ばかりにして、1回では たおれないようにする
await page.locator('.mode').first().click();
await page.getByText('3たい3').click();
for (const n of ['リザードン', 'ピカチュウ', 'カビゴン']) {
  await page.getByText(n, { exact: true }).click();
}
await page.getByText('けってい').click();
await page.getByText('じゅんび できた').click();
for (const n of ['フシギバナ', 'ミミッキュ', 'ハガネール']) {
  await page.getByText(n, { exact: true }).click();
}
await page.getByText('けってい').click();
await page.getByText('コインを なげる').click();
await page.waitForTimeout(1500);
await page.getByText('バトル スタート').click();

let sawButton = false;
let sawPrompt = false;
let promptedWithoutTap = false;   // おしていないのに 出てきたら だめ
let teraCutIn = 0;
let teraCards = 0;
let normalCycle = null;
let teraCycle = null;
let hpBefore = null;      // テラスタルわざ を うつ 直前 の あいての たいりょく
let hpAfter = null;
let askedAgain = false;   // おなじ人に 2回 きいたら だめ
const teraUsedBy = new Set();
let pickedMove = null;    // いま えらんだ わざ（'tera' か 'other'）
let restedAfterAttack = null;  // テラスタルした子が つぎの ターン やすみ に なったか
let teraAttacks = 0;      // テラスタルした子が こうげき した かいすう

/** いま だれの 手番か。下に出ている「じぶん（あか / あお）」で 見わける */
const currentPlayer = async () => {
  const label = await page.locator('.team-label').last().innerText().catch(() => '');
  return label.includes('あか') ? 'p1' : 'p2';
};

/** あいて（うえ）の たいりょく */
const targetHp = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-role=target] .card__hp-text')].map((el) => Number(el.textContent)));

for (let i = 0; i < 400; i += 1) {
  const body = await page.locator('body').innerText();
  if (body.includes('の かち！')) break;

  // おしていないのに えらぶ画面が 出ていたら だめ（まえは 毎ターン 出ていた）
  if (body.includes('だれを テラスタル する')) { promptedWithoutTap = true; }

  if (body.includes('スマホを わたしてね')) { await page.getByText('じゅんび できた').click(); continue; }
  if (body.includes('つかれてるよ')) { await page.getByText('これで いく').click(); continue; }
  if (body.includes('メガシンカ できる！')) { await page.getByText('いまは しない').click(); continue; }
  if (body.includes('だれで こうげきする')) {
    const who = await currentPlayer();
    // テラスタルした子が こうげき した あとは、つぎの じぶんの ターンで やすみ（⏸）に なるはず
    if (who === 'p1' && teraAttacks > 0 && restedAfterAttack === null) {
      restedAfterAttack = await page.evaluate(() => {
        const card = document.querySelector('[data-role=attacker] .card--tera');
        return card ? card.classList.contains('card--resting') && card.disabled : null;
      });
      await shot('65-tera-resting');
    }
    const teraButton = page.getByText('テラスタル する', { exact: false });
    if (await teraButton.count()) {
      sawButton = true;
      // あいての チーム も べつ枠で 1回 つかえる。おなじ人に 2回 出たら だめ
      if (teraUsedBy.has(who)) { askedAgain = true; }
      if (who === 'p1') {
        await shot('59-tera-button');
        await teraButton.click();
        sawPrompt = true;
        await shot('60-tera-prompt');
        await page.locator('.tera-pick__btn').first().click();
        await page.waitForTimeout(700);
        await shot('61-tera-gather');
        await page.waitForTimeout(900);
        teraCutIn = await page.locator('.tera-cutin').count();
        await shot('62-tera-reveal');
        await page.waitForTimeout(900);
        teraCards = await page.locator('.card--tera').count();
        teraUsedBy.add(who);
        continue;
      }
    }
    // テラスタルした子（かげに けっしょう）が えらべれば その子で
    const tera = page.locator('[data-role=attacker] .card--tera.card--selectable');
    if (await tera.count()) { await tera.first().click({ force: true }); teraAttacks += 1; }
    else await page.locator('[data-role=attacker] .card--selectable').first().click({ force: true });
    continue;
  }
  if (body.includes('だれを ねらう')) {
    await page.locator('[data-role=target] .card--selectable').first().click({ force: true });
    continue;
  }
  if (body.includes('どの わざに する')) {
    const tera = page.locator('.move-btn--tera');
    if ((await tera.count()) && hpBefore === null) {
      hpBefore = await targetHp();
      await shot('63-tera-move');
      await tera.click();
      pickedMove = 'tera';
    } else {
      await page.locator('.move-btn').nth(0).click(); // ふつうわざ
      pickedMove = 'other';
    }
    continue;
  }
  if (body.includes('まんなかで とめよう')) {
    // こうげきする子が テラスタル しているか で、ゲージの はやさ を くらべる
    const attackerIsTera =
      (await page.locator('[data-role=attacker] .card--selected.card--tera').count()) > 0;
    if (attackerIsTera && teraCycle === null) teraCycle = await cycleMs();
    else if (!attackerIsTera && normalCycle === null) normalCycle = await cycleMs();
    await page.locator('.gauge').click({ force: true });
    await page.waitForTimeout(2600);
    continue;
  }
  if (body.includes('タップして つぎへ')) {
    if (pickedMove === 'tera' && hpAfter === null) {
      hpAfter = await targetHp();
      await shot('64-tera-hit');
    }
    await page.locator('.battle-center').click({ force: true });
    continue;
  }
  await page.waitForTimeout(80);
}

const overflow = await page.evaluate(() => ({
  x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
}));

// ぜんいん が へっていれば「ぜんたい こうげき」。
// ばつぐん の +20 が のる子 が いるので、ぴったり 同じ には ならない
const dealt =
  hpBefore && hpAfter ? hpBefore.map((hp, index) => hp - (hpAfter[index] ?? hp)) : null;
const hitAll = dealt !== null && dealt.length === 3 && dealt.every((damage) => damage > 0);
// 等分できているか。いちばん大きい ダメージ と 小さい ダメージ の さ が
// ばつぐんボーナス（+20）の ぶん に おさまっていること
const evenlySplit =
  dealt !== null && Math.max(...dealt) - Math.min(...dealt) <= 20;

const summary = {
  sawButton, sawPrompt, promptedWithoutTap, teraCutIn, teraCards, normalCycle, teraCycle,
  slower: normalCycle && teraCycle ? teraCycle / normalCycle : null,
  hpBefore, hpAfter, dealt, hitAll, evenlySplit, teraAttacks, restedAfterAttack,
  askedAgain, overflow, errors,
};
console.log(JSON.stringify(summary, null, 2));
await browser.close();

const ok =
  sawButton &&
  sawPrompt &&
  !promptedWithoutTap &&        // おしていないのに 出てこない
  teraCutIn > 0 &&              // せんよう カットイン が出た
  teraCards > 0 &&              // かげ に けっしょう が ついた
  teraCycle !== null && normalCycle !== null &&
  teraCycle > normalCycle * 1.8 &&  // ゲージが うんと ゆっくり
  hitAll &&                     // ぜんいん に あたった
  evenlySplit &&                // ダメージが 等分されている
  !askedAgain &&                // 2回目は きかれない
  restedAfterAttack === true && // こうげきの つぎの ターンは やすみ で えらべない
  overflow.x === 0 && overflow.y === 0 &&
  errors.length === 0;

if (!ok) {
  console.error('テラスタルの かくにん しっぱい');
  process.exit(1);
}
console.log('テラスタルの かくにん せいこう');
