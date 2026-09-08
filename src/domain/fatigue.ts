import type { BattlePokemon } from './types';

/** 交代できる相手がいないと つかれても どうにもならないので、つかれない */
function canRotate(team: BattlePokemon[]): boolean {
  return team.filter((pokemon) => pokemon.hp > 0).length >= 2;
}

/**
 * つかれの更新（docs/SPEC.md §3.7）。攻撃を解決した直後に、攻撃した側のチーム全員に適用する。
 *
 * - 攻撃した子 → つかれる
 * - 攻撃しなかった（休んだ）子 → 元気に戻る
 *
 * つかれが とれるのは **休んだときだけ**。つかれたまま攻撃しても とれない。
 * ただし 戦える子が1体しかいないときは、休ませようがないので つかれない。
 */
export function updateFatigue(team: BattlePokemon[], attackerIndex: number): void {
  if (!canRotate(team)) {
    clearFatigue(team);
    return;
  }
  team.forEach((pokemon, index) => {
    pokemon.tired = index === attackerIndex;
  });
}

/** 戦える子が1体だけになったら、つかれを消す（もう交代できないため） */
export function clearFatigueIfAlone(team: BattlePokemon[]): void {
  if (!canRotate(team)) clearFatigue(team);
}

function clearFatigue(team: BattlePokemon[]): void {
  for (const pokemon of team) pokemon.tired = false;
}
