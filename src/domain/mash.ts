/**
 * メガわざ の れんだ（docs/SPEC.md §3.4.2）。
 * ゲージを まんなかで とめる のではなく、ボタンを たくさん たたいて
 * ゲージを マックスまで ためる。ねらう必要がないので、小さい子でも
 * かならず何かは出せる。
 */

/** ゲージを マックスにするのに ひつような タップ数 */
export const MASH_BASE_TAPS = 20;

/** つかれていると もっと たたかないと たまらない */
export const MASH_TIRED_SCALE = 1.4;

/** たたける じかん */
export const MASH_DURATION_MS = 3000;

export function mashTargetTaps(tired: boolean): number {
  return Math.round(MASH_BASE_TAPS * (tired ? MASH_TIRED_SCALE : 1));
}

/** たたいた数から ゲージの たまりぐあい（0〜1）を出す */
export function mashFill(taps: number, tired: boolean): number {
  return Math.min(1, Math.max(0, taps / mashTargetTaps(tired)));
}

/**
 * ためた ぶんだけ つよくなる。
 * 1つも たたけなくても 1倍は出るので、0ダメージにはならない。
 */
export function mashMultiplier(fill: number): number {
  return 1 + fill;
}
