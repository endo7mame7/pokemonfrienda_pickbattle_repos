import type { BattleSpeed, DamageMultiplier, PokemonType } from './types';

/**
 * わざの種類。
 * normal / strong は ゲージを まんなかで とめる。
 * mega は メガシンカ中だけ つかえて、ボタン連打で ゲージを ためる。
 */
export type MoveKind = 'normal' | 'strong' | 'mega';

/** ゲージを とめて ねらう わざ（メガわざ は連打なので ふくまない） */
export type TimingMoveKind = Exclude<MoveKind, 'mega'>;

/**
 * わざの ちから（docs/SPEC.md §3.4）。
 * バトルの長さを決める いちばん大きな つまみ。変えたら tools/balance-sim.py で確かめる。
 */
export const MOVE_POWER: Record<MoveKind, number> = {
  /** まんなかで とめたときの ちから。なだらかな カーブ なので 平均は これより かなり低い */
  normal: 200,
  /** とがった カーブ。ねらえたときだけ 大きく、外すと 0（docs/SPEC.md §3.4.1） */
  strong: 290,
  /** メガわざ。ねらう必要がないぶん、最大でも つよいわざ の ぴったり には とどかない */
  mega: 140,
};

/**
 * タイプごとの わざの名前。
 * 実在のわざ名は使わず、タイプが分かる やさしい ことばにしている。
 */
export const MOVE_NAMES: Record<PokemonType, Record<MoveKind, string>> = {
  ノーマル: { normal: 'からだアタック', strong: 'ぜんりょくアタック', mega: 'メガインパクト' },
  ほのお: { normal: 'ひのたま', strong: 'だいばくえん', mega: 'メガフレア' },
  みず: { normal: 'みずしぶき', strong: 'だいうずしお', mega: 'メガウェーブ' },
  でんき: { normal: 'ビリビリ', strong: 'いなずまショック', mega: 'メガサンダー' },
  くさ: { normal: 'つるアタック', strong: 'はっぱあらし', mega: 'メガリーフ' },
  こおり: { normal: 'つめたいかぜ', strong: 'こおりのあらし', mega: 'メガブリザード' },
  かくとう: { normal: 'れんぞくパンチ', strong: 'ひっさつキック', mega: 'メガナックル' },
  どく: { normal: 'どくのきり', strong: 'どくどくあらし', mega: 'メガポイズン' },
  じめん: { normal: 'すなけむり', strong: 'だいちゆれ', mega: 'メガクエイク' },
  ひこう: { normal: 'かぜおこし', strong: 'たつまきアタック', mega: 'メガストーム' },
  エスパー: { normal: 'ふしぎなちから', strong: 'ひかりのビーム', mega: 'メガサイキック' },
  むし: { normal: 'むしのはね', strong: 'むれアタック', mega: 'メガスウォーム' },
  いわ: { normal: 'いわなげ', strong: 'だいいわおとし', mega: 'メガロック' },
  ゴースト: { normal: 'おどかす', strong: 'やみのたま', mega: 'メガシャドー' },
  ドラゴン: { normal: 'りゅうのかぜ', strong: 'ドラゴンほうこう', mega: 'メガドラゴン' },
  あく: { normal: 'いじわるアタック', strong: 'やみのいちげき', mega: 'メガダーク' },
  はがね: { normal: 'てつのツメ', strong: 'てつのたいほう', mega: 'メガメタル' },
  フェアリー: { normal: 'きらきらこな', strong: 'ゆめのひかり', mega: 'メガシャイン' },
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
