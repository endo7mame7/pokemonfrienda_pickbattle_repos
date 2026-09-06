import { isSuperEffective } from './typeChart';
import type { BattlePokemon, Settings } from './types';

/** 10の倍数に切り上げる。端数は子どもに有利な側へ寄せる（docs/SPEC.md §3.4） */
export function ceilTo10(n: number): number {
  return Math.ceil(n / 10) * 10;
}

export interface DamageResult {
  damage: number;
  isSuperEffective: boolean;
  /** つかれた状態で攻撃したか。ダメージが半分になっている */
  isTired: boolean;
}

/**
 * ダメージ = ( 出目の合計 × ばいりつ + ばつぐんボーナス ) ÷ つかれ
 * docs/SPEC.md §3.4
 */
export function calcDamage(
  attacker: BattlePokemon,
  target: BattlePokemon,
  rolls: number[],
  settings: Settings,
): DamageResult {
  const diceSum = rolls.reduce((sum, roll) => sum + roll, 0);
  const superEffective = isSuperEffective(attacker.type, target.type);
  const tired = settings.fatigueEnabled && attacker.tired;

  let damage = diceSum * settings.damageMultiplier;
  if (superEffective) damage += settings.superEffectiveBonus;
  if (tired) damage = ceilTo10(damage / 2);

  return { damage, isSuperEffective: superEffective, isTired: tired };
}
