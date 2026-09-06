import type { Pick } from '../domain';

/**
 * P1（遊べる最小版）で使う仮のピック。
 * P2 でずかん（IndexedDB）に置き換える。エネルギー値は 150〜350 の想定に合わせている。
 */
const RAW: Array<Omit<Pick, 'id' | 'useCount' | 'createdAt' | 'updatedAt'>> = [
  { name: 'リザードン', type: 'ほのお', energy: 320, canMegaEvolve: true },
  { name: 'カメックス', type: 'みず', energy: 310, canMegaEvolve: true },
  { name: 'フシギバナ', type: 'くさ', energy: 310, canMegaEvolve: true },
  { name: 'ピカチュウ', type: 'でんき', energy: 180, canMegaEvolve: false },
  { name: 'ゲンガー', type: 'ゴースト', energy: 250, canMegaEvolve: true },
  { name: 'カビゴン', type: 'ノーマル', energy: 350, canMegaEvolve: false },
  { name: 'ミミッキュ', type: 'ゴースト', energy: 200, canMegaEvolve: false },
  { name: 'ルカリオ', type: 'かくとう', energy: 260, canMegaEvolve: true },
  { name: 'ギャラドス', type: 'みず', energy: 300, canMegaEvolve: true },
  { name: 'サーナイト', type: 'エスパー', energy: 240, canMegaEvolve: true },
  { name: 'ハガネール', type: 'はがね', energy: 290, canMegaEvolve: false },
  { name: 'イーブイ', type: 'ノーマル', energy: 150, canMegaEvolve: false },
];

export const SAMPLE_PICKS: Pick[] = RAW.map((pick, index) => ({
  ...pick,
  id: `sample-${index + 1}`,
  useCount: 0,
  createdAt: 0,
  updatedAt: 0,
}));
