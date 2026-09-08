import type { BattleSpeed, DamageMultiplier, PokemonType } from './types';

/** わざの種類。つよい ほど ねらう場所が せまい */
export type MoveKind = 'normal' | 'strong';

/**
 * わざの ちから（docs/SPEC.md §3.4）。
 * バトルの長さを決める いちばん大きな つまみ。変えたら tools/balance-sim.py で確かめる。
 */
export const MOVE_POWER: Record<MoveKind, number> = {
  normal: 110,
  strong: 190,
};

/**
 * タイプごとの わざの名前。
 * 実在のわざ名は使わず、タイプが分かる やさしい ことばにしている。
 */
export const MOVE_NAMES: Record<PokemonType, Record<MoveKind, string>> = {
  ノーマル: { normal: 'からだアタック', strong: 'ぜんりょくアタック' },
  ほのお: { normal: 'ひのたま', strong: 'だいばくえん' },
  みず: { normal: 'みずしぶき', strong: 'だいうずしお' },
  でんき: { normal: 'ビリビリ', strong: 'いなずまショック' },
  くさ: { normal: 'つるアタック', strong: 'はっぱあらし' },
  こおり: { normal: 'つめたいかぜ', strong: 'こおりのあらし' },
  かくとう: { normal: 'れんぞくパンチ', strong: 'ひっさつキック' },
  どく: { normal: 'どくのきり', strong: 'どくどくあらし' },
  じめん: { normal: 'すなけむり', strong: 'だいちゆれ' },
  ひこう: { normal: 'かぜおこし', strong: 'たつまきアタック' },
  エスパー: { normal: 'ふしぎなちから', strong: 'ひかりのビーム' },
  むし: { normal: 'むしのはね', strong: 'むれアタック' },
  いわ: { normal: 'いわなげ', strong: 'だいいわおとし' },
  ゴースト: { normal: 'おどかす', strong: 'やみのたま' },
  ドラゴン: { normal: 'りゅうのかぜ', strong: 'ドラゴンほうこう' },
  あく: { normal: 'いじわるアタック', strong: 'やみのいちげき' },
  はがね: { normal: 'てつのツメ', strong: 'てつのたいほう' },
  フェアリー: { normal: 'きらきらこな', strong: 'ゆめのひかり' },
};

/** バトルの ながさ で わざの ちから を上げ下げする */
export const SPEED_POWER_SCALE: Record<BattleSpeed, number> = {
  fast: 1.4,
  normal: 1,
  slow: 0.7,
};

/** サイコロ方式のときの ばいりつ。ながさ の設定と そろえる */
export const SPEED_DICE_MULTIPLIER: Record<BattleSpeed, DamageMultiplier> = {
  fast: 30,
  normal: 20,
  slow: 10,
};

export function movePower(kind: MoveKind, speed: BattleSpeed): number {
  return MOVE_POWER[kind] * SPEED_POWER_SCALE[speed];
}

export function moveName(type: PokemonType, kind: MoveKind): string {
  return MOVE_NAMES[type][kind];
}
