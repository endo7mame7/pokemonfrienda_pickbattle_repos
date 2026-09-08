import { movePower } from './moves';
import type { MoveKind } from './moves';
import { TIMING_MULTIPLIER } from './timing';
import type { TimingResult } from './timing';
import { isSuperEffective } from './typeChart';
import type { BattlePokemon, Settings } from './types';

/** 10の倍数に切り上げる。端数は子どもに有利な側へ寄せる（docs/SPEC.md §3.4） */
export function ceilTo10(n: number): number {
  return Math.ceil(n / 10) * 10;
}

/** メガシンカ中はタイミングの威力が上がる（サイコロのときは2個になる） */
export const MEGA_POWER_MULTIPLIER = 1.5;

export interface DamageResult {
  damage: number;
  isSuperEffective: boolean;
  /** つかれた状態で攻撃したか。ダメージが半分になっている */
  isTired: boolean;
}

/** サイコロの出目か、わざ＋タイミングか。どちらで攻撃したか */
export type AttackInput =
  | { style: 'dice'; rolls: number[] }
  | { style: 'timing'; move: MoveKind; timing: TimingResult };

/**
 * ダメージ = ( もとの ちから + ばつぐんボーナス ) ÷ つかれ
 * docs/SPEC.md §3.4
 */
export function calcDamage(
  attacker: BattlePokemon,
  target: BattlePokemon,
  input: AttackInput,
  settings: Settings,
): DamageResult {
  const superEffective = isSuperEffective(attacker.type, target.type);
  const tired = settings.fatigueEnabled && attacker.tired;
  // タイミング方式では、つかれは「ねらう ところが せまくなる」で表す（§3.7）。
  // ダメージを半分にするのは サイコロ方式のときだけ。
  const halvesDamage = tired && input.style === 'dice';

  let damage =
    input.style === 'dice'
      ? input.rolls.reduce((sum, roll) => sum + roll, 0) * settings.damageMultiplier
      : movePower(input.move, settings.battleSpeed) *
        TIMING_MULTIPLIER[input.timing] *
        (attacker.megaEvolved ? MEGA_POWER_MULTIPLIER : 1);

  if (superEffective) damage += settings.superEffectiveBonus;
  if (halvesDamage) damage /= 2;

  return { damage: ceilTo10(damage), isSuperEffective: superEffective, isTired: tired };
}
