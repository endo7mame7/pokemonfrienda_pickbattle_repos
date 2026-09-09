/**
 * テラスタルわざ の けっしょうタップ（docs/SPEC.md §3.11）。
 *
 * ゲージを まんなかで とめる（ふつう・つよい）でも、
 * ボタンを れんだ する（メガわざ）でも ない、3つめの だしかた。
 * 画面に ちらばった けっしょう を、じかん内に ぜんぶ タップする。
 *
 * 「ぜんいん に あたる」わざ なので、**画面ぜんたい を さわる**動きが
 * 見た目とも あっている。
 */

/** ならぶ けっしょう の 数 */
export const TAP_CRYSTAL_COUNT = 6;

/** つかれていると けっしょう が ふえて、ぜんぶ とるのが たいへんになる */
export const TAP_TIRED_EXTRA = 2;

/** タップ できる じかん */
export const TAP_DURATION_MS = 3500;

export function tapCrystalCount(tired: boolean): number {
  return TAP_CRYSTAL_COUNT + (tired ? TAP_TIRED_EXTRA : 0);
}

/**
 * とれた 数から ちから の わりあい（0〜1）を出す。
 * ぜんぶ とれば 1。1つも とれなければ 0（＝0ダメージ）。
 */
export function tapFill(tapped: number, tired: boolean): number {
  return Math.min(1, Math.max(0, tapped / tapCrystalCount(tired)));
}
