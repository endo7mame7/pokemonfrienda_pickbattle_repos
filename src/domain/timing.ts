import type { MoveKind } from './moves';

/** ゲージを止めた結果 */
export type TimingResult = 'perfect' | 'near' | 'miss';

/**
 * ゲージの まんなか からの ずれ が、この はば の中なら成功。
 * つよい わざ ほど せまい（0〜0.5 で、ゲージの半分ぶんが 0.5）。
 */
export const TIMING_ZONES: Record<MoveKind, { perfect: number; near: number }> = {
  normal: { perfect: 0.12, near: 0.32 },
  strong: { perfect: 0.06, near: 0.22 },
};

/** タイミングでダメージが何倍になるか */
export const TIMING_MULTIPLIER: Record<TimingResult, number> = {
  perfect: 2,
  near: 1,
  miss: 0.5,
};

/**
 * ゲージを止めた位置（0〜1、0.5 が まんなか）から結果を出す。
 * どんなに外しても miss（0.5倍）どまりで、0ダメージにはしない。
 */
export function judgeTiming(position: number, kind: MoveKind): TimingResult {
  const zones = TIMING_ZONES[kind];
  const distance = Math.abs(position - 0.5);
  if (distance <= zones.perfect) return 'perfect';
  if (distance <= zones.near) return 'near';
  return 'miss';
}
