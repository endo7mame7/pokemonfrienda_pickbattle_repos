import type { TimingMoveKind } from './moves';
import type { GaugeSpeed } from './types';

/** ゲージを止めた結果。ダメージそのものではなく、見せかたの ラベル */
export type TimingResult = 'perfect' | 'near' | 'miss';

/**
 * わざの あたりかた（docs/SPEC.md §3.4.1）。
 *
 * まんなかからの ずれ d にたいして、ちから の わりあい を
 * つりがね（正規分布）の かたち で だす。
 *
 *   ふつうわざ … σ が 大きく、なだらか。はずしても floor までしか 下がらない
 *   つよいわざ … σ が 小さく とがっている。すそ を切ってあるので、外すと 0
 *
 * ゾーンで区切らず なめらかに することで、
 * 「まんなかに 近いほど かならず 強い」が いつでも なりたつ。
 */
export interface MoveCurve {
  /** ひろがり。小さいほど とがっていて むずかしい */
  sigma: number;
  /** はずしても これだけは入る（まんなかを 1 とした わりあい）。0 なら 0ダメージ まで落ちる */
  floor: number;
  /** floor が 0 の わざ で、すそ を切り落として 0 にする たかさ */
  cut: number;
}

export const MOVE_CURVE: Record<TimingMoveKind, MoveCurve> = {
  normal: { sigma: 0.22, floor: 0.22, cut: 0 },
  strong: { sigma: 0.1, floor: 0, cut: 0.15 },
};

/**
 * つかれていると カーブが とがる（＝ねらう ところが せまくなる・docs/SPEC.md §3.7）。
 * ダメージを半分にするより、「うまく当てにくい」ほうが
 * タイミングのゲームらしく、当てられたときの うれしさ も残る。
 */
export const TIRED_SIGMA_SCALE = 0.6;

/** メガシンカ中は カーブが ひろがる（＝当てやすい・docs/SPEC.md §3.6） */
export const MEGA_SIGMA_SCALE = 1.4;

export interface TimingModifiers {
  tired?: boolean;
  megaEvolved?: boolean;
}

/** そのポケモンの いまの ひろがり */
export function sigmaFor(
  kind: TimingMoveKind,
  { tired = false, megaEvolved = false }: TimingModifiers = {},
): number {
  return (
    MOVE_CURVE[kind].sigma * (tired ? TIRED_SIGMA_SCALE : 1) * (megaEvolved ? MEGA_SIGMA_SCALE : 1)
  );
}

/** まんなかからの ずれ から、ちから の わりあい（0〜1）を出す */
export function ratioAtDistance(
  kind: TimingMoveKind,
  distance: number,
  modifiers: TimingModifiers = {},
): number {
  const { floor, cut } = MOVE_CURVE[kind];
  const sigma = sigmaFor(kind, modifiers);
  const bell = Math.exp(-((distance / sigma) ** 2) / 2);
  if (floor > 0) return floor + (1 - floor) * bell;
  return Math.max(0, (bell - cut) / (1 - cut));
}

/** ゲージを止めた位置（0〜1、0.5 が まんなか）から わりあい を出す */
export function ratioAt(
  position: number,
  kind: TimingMoveKind,
  modifiers: TimingModifiers = {},
): number {
  return ratioAtDistance(kind, Math.abs(position - 0.5), modifiers);
}

/** ラベルの さかいめ。ダメージは なめらかに 変わり、ここは 見せかた だけ */
export const PERFECT_RATIO = 0.85;
export const NEAR_RATIO = 0.4;

export function judgeRatio(ratio: number): TimingResult {
  if (ratio >= PERFECT_RATIO) return 'perfect';
  if (ratio >= NEAR_RATIO) return 'near';
  return 'miss';
}

/** ゲージを止めた位置から ラベル を出す */
export function judgeTiming(
  position: number,
  kind: TimingMoveKind,
  modifiers: TimingModifiers = {},
): TimingResult {
  return judgeRatio(ratioAt(position, kind, modifiers));
}

/**
 * その わりあい に なる ずれ を逆に もとめる（ゲージの色分けに使う）。
 * まんなか に近いほど わりあい が大きいので、こたえは 1つに決まる。
 */
export function distanceForRatio(
  kind: TimingMoveKind,
  ratio: number,
  modifiers: TimingModifiers = {},
): number {
  const { floor, cut } = MOVE_CURVE[kind];
  const sigma = sigmaFor(kind, modifiers);
  const bell = floor > 0 ? (ratio - floor) / (1 - floor) : ratio * (1 - cut) + cut;
  if (bell >= 1) return 0;
  if (bell <= 0) return 0.5; // そこまで 下がらない
  return Math.min(0.5, sigma * Math.sqrt(2 * Math.log(1 / bell)));
}

/** ゲージの 色分け に使う さかいめ（すべて まんなかからの ずれ） */
export interface TimingZones {
  /** ここまでが ぴったり */
  perfect: number;
  /** ここまでが ちかい */
  near: number;
  /** ここから そとは 0ダメージ。0にならない わざ では 0.5（＝ない） */
  zero: number;
}

export function zonesFor(kind: TimingMoveKind, modifiers: TimingModifiers = {}): TimingZones {
  return {
    perfect: distanceForRatio(kind, PERFECT_RATIO, modifiers),
    near: distanceForRatio(kind, NEAR_RATIO, modifiers),
    zero: MOVE_CURVE[kind].floor > 0 ? 0.5 : distanceForRatio(kind, 0, modifiers),
  };
}

/* --- ゲージの はやさ（docs/SPEC.md §4） --- */

/** ゲージが 左右を 1往復する じかん の もとの あたい */
export const GAUGE_BASE_CYCLE_MS = 1400;

/** せってい。数が大きいほど ゆっくり */
export const GAUGE_SPEED_SCALE: Record<GaugeSpeed, number> = {
  slow: 1.45,
  normal: 1,
  fast: 0.7,
};

/** つよいわざ は ゲージが はやい。ねらうのが もっと むずかしくなる */
export const MOVE_GAUGE_SCALE: Record<TimingMoveKind, number> = {
  normal: 1,
  strong: 0.7,
};

export function gaugeCycleMs(speed: GaugeSpeed, kind: TimingMoveKind): number {
  return Math.round(GAUGE_BASE_CYCLE_MS * GAUGE_SPEED_SCALE[speed] * MOVE_GAUGE_SCALE[kind]);
}
