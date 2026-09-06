import type { BattlePokemon } from './types';

/**
 * つかれの更新（docs/SPEC.md §3.7）。攻撃を解決した直後に、攻撃した側のチーム全員に適用する。
 *
 * - 全力で攻撃した子 → つかれる
 * - つかれた状態で攻撃した子 → 元気に戻る（無理をしたので、それ以上は疲れない）
 * - 攻撃しなかった（休んだ）子 → 元気に戻る
 *
 * この形にしているため、1体しかいない 1vs1 では「ぜんりょく → はんぶん → ぜんりょく」と
 * 交互になり、2体以上いるときは順番に交代すれば全員ずっと全力で戦える。
 */
export function updateFatigue(
  team: BattlePokemon[],
  attackerIndex: number,
  wasTired: boolean,
): void {
  team.forEach((pokemon, index) => {
    pokemon.tired = index === attackerIndex ? !wasTired : false;
  });
}
