import type { TimingMoveKind } from './moves';

/** ゲージを止めた結果 */
export type TimingResult = 'perfect' | 'near' | 'miss';

/**
 * ゲージの まんなか からの ずれ で わざの あたり を決める（docs/SPEC.md §3.4.1）。
 * まんなかから そとへ、こう ならんでいる:
 *
 *   [ ぴったり ][ あいだの はずれ ][ ちかい ][ そとの はずれ ]
 *
 * - perfect  : ここまでが ぴったり
 * - gapWidth : ぴったり の すぐ そとに おく「あいだの はずれ」の はば（0 なら なし）
 * - near     : あいだの はずれ の そとから ここまでが ちかい
 *
 * つよいわざ は ぴったり が せまいうえ、はずすと 0ダメージ。
 * ふつうわざ は あいだの はずれ が なく、はずしても 半分は入る。
 */
export const TIMING_ZONES: Record<
  TimingMoveKind,
  { perfect: number; gapWidth: number; near: number }
> = {
  normal: { perfect: 0.12, gapWidth: 0, near: 0.32 },
  strong: { perfect: 0.06, gapWidth: 0.06, near: 0.26 },
};

/**
 * つかれていると ねらう ところが せまくなる（docs/SPEC.md §3.7）。
 * ダメージを半分にするより、「うまく当てにくい」ほうが
 * タイミングのゲームらしく、当てられたときの うれしさ も残る。
 * あいだの はずれ は ひろがる（＝より あぶない）。
 */
export const TIRED_ZONE_SCALE = { perfect: 0.5, gapWidth: 1.4, near: 0.7 };

/** メガシンカ中は ねらう ところが ひろく、あいだの はずれ が せまくなる（docs/SPEC.md §3.6） */
export const MEGA_ZONE_SCALE = { perfect: 1.5, gapWidth: 0.7, near: 1.2 };

export interface TimingModifiers {
  tired?: boolean;
  megaEvolved?: boolean;
}

/** ゾーンの さかいめ。すべて まんなかからの ずれ で、perfect ≤ gap ≤ near */
export interface TimingZones {
  perfect: number;
  gap: number;
  near: number;
}

/** そのポケモンの いまの ねらう はば */
export function zonesFor(
  kind: TimingMoveKind,
  { tired = false, megaEvolved = false }: TimingModifiers = {},
): TimingZones {
  const base = TIMING_ZONES[kind];
  const scale = (key: 'perfect' | 'gapWidth' | 'near') =>
    base[key] * (tired ? TIRED_ZONE_SCALE[key] : 1) * (megaEvolved ? MEGA_ZONE_SCALE[key] : 1);

  const perfect = scale('perfect');
  const gap = perfect + scale('gapWidth');
  // ちかい が あいだの はずれ より内側に来てしまわないようにする
  const near = Math.max(scale('near'), gap);
  return { perfect, gap, near };
}

/** はずした ときの ばいりつ。つよいわざ だけ 0（じぶんで えらんだ ばくち なので） */
export const MISS_MULTIPLIER: Record<TimingMoveKind, number> = {
  normal: 0.5,
  strong: 0,
};

/** タイミングでダメージが何倍になるか */
export function timingMultiplier(kind: TimingMoveKind, result: TimingResult): number {
  if (result === 'perfect') return 2;
  if (result === 'near') return 1;
  return MISS_MULTIPLIER[kind];
}

/**
 * ゲージを止めた位置（0〜1、0.5 が まんなか）から結果を出す。
 * ぴったり の すぐ そと（あいだの はずれ）も はずれ になる。
 */
export function judgeTiming(
  position: number,
  kind: TimingMoveKind,
  modifiers: TimingModifiers = {},
): TimingResult {
  const zones = zonesFor(kind, modifiers);
  const distance = Math.abs(position - 0.5);
  if (distance <= zones.perfect) return 'perfect';
  if (distance <= zones.gap) return 'miss'; // あいだの はずれ
  if (distance <= zones.near) return 'near';
  return 'miss'; // そとの はずれ
}
