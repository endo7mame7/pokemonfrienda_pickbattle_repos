import { MEGA_THRESHOLD_RATIO } from './types';
import type { BattlePokemon, Settings } from './types';

/**
 * メガシンカの発動判定（docs/SPEC.md §3.6）。
 * ダメージ適用の直後に、攻撃を受けた側の全ポケモンについて判定する。
 * ひんしになった場合は発動しない。
 */
export function shouldMegaEvolve(pokemon: BattlePokemon, settings: Settings): boolean {
  const ratio = MEGA_THRESHOLD_RATIO[settings.megaThreshold];
  if (ratio === null) return false;
  if (!pokemon.canMegaEvolve || pokemon.megaEvolved || pokemon.hp <= 0) return false;

  // hp <= maxHp × (numerator / denominator) を、小数を使わずに判定する
  return pokemon.hp * ratio.denominator <= pokemon.maxHp * ratio.numerator;
}

/** 発動条件を満たしたポケモンをメガシンカさせ、対象を返す */
export function applyMegaEvolution(
  team: BattlePokemon[],
  settings: Settings,
): BattlePokemon[] {
  const evolved = team.filter((pokemon) => shouldMegaEvolve(pokemon, settings));
  for (const pokemon of evolved) {
    pokemon.megaEvolved = true;
  }
  return evolved;
}
