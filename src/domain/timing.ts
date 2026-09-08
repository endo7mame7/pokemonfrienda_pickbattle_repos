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

/**
 * つかれていると ねらう ところが せまくなる（docs/SPEC.md §3.7）。
 * ダメージを半分にするより、「うまく当てにくい」ほうが
 * タイミングのゲームらしく、当てられたときの うれしさ も残る。
 */
export const TIRED_ZONE_SCALE = { perfect: 0.5, near: 0.7 };

/** メガシンカ中は ねらう ところが ひろくなる（docs/SPEC.md §3.6） */
export const MEGA_ZONE_SCALE = { perfect: 1.5, near: 1.2 };

export interface TimingModifiers {
  tired?: boolean;
  megaEvolved?: boolean;
}

/** そのポケモンの いまの ねらう はば */
export function zonesFor(
  kind: MoveKind,
  { tired = false, megaEvolved = false }: TimingModifiers = {},
): { perfect: number; near: number } {
  const base = TIMING_ZONES[kind];
  const perfect =
    base.perfect * (tired ? TIRED_ZONE_SCALE.perfect : 1) * (megaEvolved ? MEGA_ZONE_SCALE.perfect : 1);
  const near =
    base.near * (tired ? TIRED_ZONE_SCALE.near : 1) * (megaEvolved ? MEGA_ZONE_SCALE.near : 1);
  return { perfect, near };
}

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
export function judgeTiming(
  position: number,
  kind: MoveKind,
  modifiers: TimingModifiers = {},
): TimingResult {
  const zones = zonesFor(kind, modifiers);
  const distance = Math.abs(position - 0.5);
  if (distance <= zones.perfect) return 'perfect';
  if (distance <= zones.near) return 'near';
  return 'miss';
}
