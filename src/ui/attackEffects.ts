import type { PokemonType } from '../domain';

/** タイプごとの攻撃エフェクトの見た目（docs/SPEC.md §3.10） */
export interface AttackEffectStyle {
  /** 飛びちる かけら */
  particle: string;
  /** ど真ん中に出る しるし */
  center: string;
}

export const TYPE_EFFECTS: Record<PokemonType, AttackEffectStyle> = {
  ノーマル: { particle: '💫', center: '💥' },
  ほのお: { particle: '🔥', center: '🔥' },
  みず: { particle: '💧', center: '🌊' },
  でんき: { particle: '⚡', center: '⚡' },
  くさ: { particle: '🍃', center: '🌿' },
  こおり: { particle: '❄️', center: '🧊' },
  かくとう: { particle: '💢', center: '👊' },
  どく: { particle: '🫧', center: '☠️' },
  じめん: { particle: '🪨', center: '🏜️' },
  ひこう: { particle: '💨', center: '🌪️' },
  エスパー: { particle: '✨', center: '🔮' },
  むし: { particle: '🌀', center: '🐝' },
  いわ: { particle: '🪨', center: '🗿' },
  ゴースト: { particle: '👁️', center: '👻' },
  ドラゴン: { particle: '☄️', center: '🐲' },
  あく: { particle: '🌑', center: '🦇' },
  はがね: { particle: '⚙️', center: '🔩' },
  フェアリー: { particle: '💗', center: '🌸' },
};

/**
 * ダメージから エフェクトの迫力 を決める。
 * サイコロの目・ばつぐん・メガシンカ・つかれ が すべてダメージに出るので、
 * ダメージ1つを見れば「どれくらい強い攻撃だったか」が分かる。
 */
export function effectIntensity(damage: number): number {
  const scaled = damage / 180;
  return Math.min(1.5, Math.max(0.35, scaled));
}

/** かけらの数。強い攻撃ほど たくさん飛ぶ */
export function particleCount(intensity: number): number {
  return Math.round(5 + intensity * 7);
}
