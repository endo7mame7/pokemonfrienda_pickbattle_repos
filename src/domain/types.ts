/** ポケモンのタイプ。フレンダのピックには1つだけ記載されている */
export const POKEMON_TYPES = [
  'ノーマル', 'ほのお', 'みず', 'でんき', 'くさ', 'こおり',
  'かくとう', 'どく', 'じめん', 'ひこう', 'エスパー', 'むし',
  'いわ', 'ゴースト', 'ドラゴン', 'あく', 'はがね', 'フェアリー',
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

/**
 * ポケモンの「かげ」の形。実在のイラストは著作権上つかえないため、
 * 生きもののシルエットだけを見せる。登録するときに形を選べる。
 */
export const SILHOUETTE_SHAPES = [
  'まる', 'よつあし', 'にそく', 'つばさ', 'へび', 'さかな', 'むし', 'おばけ',
] as const;

export type SilhouetteShape = (typeof SILHOUETTE_SHAPES)[number];

/** ずかんに登録された1枚のピック */
export interface Pick {
  id: string;
  name: string;
  type: PokemonType;
  /** エネルギー値。そのまま初期たいりょくになる（150〜350程度） */
  energy: number;
  canMegaEvolve: boolean;
  /** かげの形。指定しないときは名前から自動できめる */
  silhouette?: SilhouetteShape;
  /** 実物ピックの写真（長辺512pxに縮小して保存する） */
  photo?: Blob;
  /** 使用回数。ずかんの「よくつかう順」に使う */
  useCount: number;
  createdAt: number;
  updatedAt: number;
}

/** バトル中のポケモンの状態。永続化しない */
export interface BattlePokemon {
  pickId: string;
  name: string;
  type: PokemonType;
  maxHp: number;
  /** 0 になったら ひんし */
  hp: number;
  canMegaEvolve: boolean;
  silhouette?: SilhouetteShape;
  megaEvolved: boolean;
  /** 全力で攻撃した次のターン。ダメージが半分になる */
  tired: boolean;
  /** MVP 判定に使う累計与ダメージ */
  damageDealt: number;
}

export type PlayerId = 'p1' | 'p2';

export const OPPONENT_OF: Record<PlayerId, PlayerId> = { p1: 'p2', p2: 'p1' };

/** メガシンカの発動ライン。'off' はメガシンカを使わない */
export type MegaThreshold = 'half' | 'third' | 'quarter' | 'off';

/**
 * 発動ラインは分数のまま持つ。小数にすると 300 × (1/3) が 99.999… になり、
 * ちょうど 1/3 のときに発動しなくなるため。
 */
export interface Fraction {
  numerator: number;
  denominator: number;
}

export const MEGA_THRESHOLD_RATIO: Record<MegaThreshold, Fraction | null> = {
  half: { numerator: 1, denominator: 2 },
  third: { numerator: 1, denominator: 3 },
  quarter: { numerator: 1, denominator: 4 },
  off: null,
};

export type DamageMultiplier = 10 | 20 | 30;
export type SuperEffectiveBonus = 0 | 10 | 20 | 40 | 60;

/** 保護者向け設定（docs/SPEC.md §4） */
export interface Settings {
  damageMultiplier: DamageMultiplier;
  superEffectiveBonus: SuperEffectiveBonus;
  megaThreshold: MegaThreshold;
  fatigueEnabled: boolean;
  soundEnabled: boolean;
  speechEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  damageMultiplier: 20,
  superEffectiveBonus: 20,
  megaThreshold: 'third',
  fatigueEnabled: true,
  soundEnabled: true,
  speechEnabled: true,
};
