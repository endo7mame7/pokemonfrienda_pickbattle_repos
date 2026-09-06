import { SILHOUETTE_SHAPES } from '../domain';
import type { PokemonType, SilhouetteShape } from '../domain';
import { TYPE_COLORS } from './typeColors';

/** 形が指定されていないときは、名前から決める。同じ名前なら いつも同じ かげ になる */
export function shapeForName(name: string): SilhouetteShape {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.codePointAt(0)!) % 100000;
  }
  return SILHOUETTE_SHAPES[hash % SILHOUETTE_SHAPES.length]!;
}

/** タイプの色を暗くして、かげの色にする */
export function silhouetteColor(type: PokemonType): string {
  const hex = TYPE_COLORS[type];
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${channels.map((c) => Math.round(c * 0.42)).join(',')})`;
}
