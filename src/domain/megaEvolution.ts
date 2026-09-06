import { MEGA_THRESHOLD_RATIO } from './types';
import type { BattlePokemon, Settings } from './types';

/**
 * メガシンカ できる状態かどうか（docs/SPEC.md §3.6）。
 * 条件を満たしても自動では発動しない。自分のターンのはじめに
 * 「メガシンカする？」と聞き、プレイヤーが選ぶ。
 * ひんしになった場合は発動できない。
 */
export function shouldMegaEvolve(pokemon: BattlePokemon, settings: Settings): boolean {
  const ratio = MEGA_THRESHOLD_RATIO[settings.megaThreshold];
  if (ratio === null) return false;
  if (!pokemon.canMegaEvolve || pokemon.megaEvolved || pokemon.hp <= 0) return false;

  // hp <= maxHp × (numerator / denominator) を、小数を使わずに判定する
  return pokemon.hp * ratio.denominator <= pokemon.maxHp * ratio.numerator;
}

/**
 * メガシンカできるポケモンを1体さがす。自分のターンのはじめに呼び、
 * 見つかったら「メガシンカする？」とプレイヤーに聞く。
 */
export function findMegaCandidateIndex(
  team: BattlePokemon[],
  settings: Settings,
): number | null {
  const index = team.findIndex((pokemon) => shouldMegaEvolve(pokemon, settings));
  return index === -1 ? null : index;
}
