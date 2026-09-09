import type { TimingMoveKind } from './moves';
import type { GaugeSpeed } from './types';

/** ゲージを止めた結果。見せかたの ラベル */
export type TimingResult = 'perfect' | 'near' | 'miss';

/** あたりかたの 1段（docs/SPEC.md §3.4.1） */
export interface DamageStep {
  /** まんなかからの ずれ が ここまでなら この段（いちばん外は 0.5） */
  until: number;
  /** その段の ちから。バトルの ながさ の設定で 0.7〜1.4倍される */
  power: number;
}

/**
 * わざの あたりかた。**なめらかな カーブ ではなく 段**で決める。
 *
 *   ふつうわざ … 4段。なだらかで、はずしても 60 は入る
 *   つよいわざ … 3段＋0ダメージ帯。まんなかが せまく、外すと 0
 *
 * 段にすると ゲージに そのまま 数字を書けるので、
 * 「どこで とめると 何ダメージか」が 見たまま わかる。
 * いちばん内がわ の ちから は MOVE_POWER と そろえてある。
 */
export const MOVE_STEPS: Record<TimingMoveKind, DamageStep[]> = {
  normal: [
    { until: 0.14, power: 200 },
    { until: 0.28, power: 150 },
    { until: 0.4, power: 100 },
    { until: 0.5, power: 60 },
  ],
  strong: [
    { until: 0.06, power: 290 },
    { until: 0.13, power: 200 },
    { until: 0.21, power: 100 },
    { until: 0.5, power: 0 },
  ],
};

/** つかれていると 段が せまくなる（＝ねらいにくい・docs/SPEC.md §3.7） */
export const TIRED_STEP_SCALE = 0.6;

/** メガシンカ中は 段が ひろくなる（＝ねらいやすい・docs/SPEC.md §3.6） */
export const MEGA_STEP_SCALE = 1.4;

export interface TimingModifiers {
  tired?: boolean;
  megaEvolved?: boolean;
}

/**
 * いまの じょうたい での 段。
 * いちばん外の段は かならず 0.5 まで とどく（どこで止めても どれかの段に入る）。
 */
export function stepsFor(
  kind: TimingMoveKind,
  { tired = false, megaEvolved = false }: TimingModifiers = {},
): DamageStep[] {
  const scale = (tired ? TIRED_STEP_SCALE : 1) * (megaEvolved ? MEGA_STEP_SCALE : 1);
  const steps = MOVE_STEPS[kind];
  return steps.map((step, index) => ({
    power: step.power,
    until: index === steps.length - 1 ? 0.5 : Math.min(0.5, step.until * scale),
  }));
}

/** まんなかからの ずれ が 何段目か（0 が まんなか） */
export function stepIndexAtDistance(
  kind: TimingMoveKind,
  distance: number,
  modifiers: TimingModifiers = {},
): number {
  const steps = stepsFor(kind, modifiers);
  const index = steps.findIndex((step) => distance <= step.until);
  return index === -1 ? steps.length - 1 : index;
}

/** ゲージを止めた位置（0〜1、0.5 が まんなか）が 何段目か */
export function stepIndexAt(
  position: number,
  kind: TimingMoveKind,
  modifiers: TimingModifiers = {},
): number {
  return stepIndexAtDistance(kind, Math.abs(position - 0.5), modifiers);
}

/** ゲージを止めた位置の ちから（バトルの ながさ の設定は かけていない） */
export function stepPowerAt(
  position: number,
  kind: TimingMoveKind,
  modifiers: TimingModifiers = {},
): number {
  const steps = stepsFor(kind, modifiers);
  return steps[stepIndexAt(position, kind, modifiers)]?.power ?? 0;
}

/** 段の ばんごう から ラベル を出す。まんなかが ぴったり、そのとなりが ちかい */
export function judgeStep(index: number): TimingResult {
  if (index === 0) return 'perfect';
  if (index === 1) return 'near';
  return 'miss';
}

/** ゲージを止めた位置から ラベル を出す */
export function judgeTiming(
  position: number,
  kind: TimingMoveKind,
  modifiers: TimingModifiers = {},
): TimingResult {
  return judgeStep(stepIndexAt(position, kind, modifiers));
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
