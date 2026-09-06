import type { PokemonType } from '../domain';

/** タイプごとの色。文字が読めなくても色で見分けられるようにする（UX要件 U-12） */
export const TYPE_COLORS: Record<PokemonType, string> = {
  ノーマル: '#9aa0a6',
  ほのお: '#ef6c3a',
  みず: '#3b82d6',
  でんき: '#d9a400',
  くさ: '#3f9e46',
  こおり: '#3fa8bd',
  かくとう: '#c0392b',
  どく: '#9b59b6',
  じめん: '#a5761b',
  ひこう: '#5b87c7',
  エスパー: '#e0417a',
  むし: '#77932a',
  いわ: '#8c7742',
  ゴースト: '#6b5b95',
  ドラゴン: '#5f47c9',
  あく: '#5a4a42',
  はがね: '#6f7d8c',
  フェアリー: '#dd6ca6',
};
