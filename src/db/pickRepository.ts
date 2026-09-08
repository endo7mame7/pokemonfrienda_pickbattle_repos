import { db } from './db';
import type { Pick, PokemonType, SilhouetteShape } from '../domain';

export type PickSort = 'useCount' | 'name' | 'energy' | 'createdAt';

export interface PickInput {
  name: string;
  type: PokemonType;
  energy: number;
  canMegaEvolve: boolean;
  silhouette?: SilhouetteShape | undefined;
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `pick-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** 入力から新しいピックを作る */
export function createPick(input: PickInput, now = Date.now()): Pick {
  return {
    id: newId(),
    name: input.name,
    type: input.type,
    energy: input.energy,
    canMegaEvolve: input.canMegaEvolve,
    ...(input.silhouette ? { silhouette: input.silhouette } : {}),
    useCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/** 既存のピックに入力を反映する（かげの形は未指定なら消す） */
export function applyInput(pick: Pick, input: PickInput, now = Date.now()): Pick {
  const { silhouette, ...rest } = pick;
  void silhouette;
  return {
    ...rest,
    name: input.name,
    type: input.type,
    energy: input.energy,
    canMegaEvolve: input.canMegaEvolve,
    ...(input.silhouette ? { silhouette: input.silhouette } : {}),
    updatedAt: now,
  };
}

const COMPARATORS: Record<PickSort, (a: Pick, b: Pick) => number> = {
  // よくつかう順。同じならなまえ順
  useCount: (a, b) => b.useCount - a.useCount || a.name.localeCompare(b.name, 'ja'),
  name: (a, b) => a.name.localeCompare(b.name, 'ja'),
  energy: (a, b) => b.energy - a.energy,
  createdAt: (a, b) => a.createdAt - b.createdAt,
};

/** ずかんの一覧。20〜50件なので、ぜんぶ読んでから並べ替える */
export async function listPicks(sort: PickSort = 'useCount'): Promise<Pick[]> {
  const picks = await db.picks.toArray();
  return picks.sort(COMPARATORS[sort]);
}

export async function getPick(id: string): Promise<Pick | undefined> {
  return db.picks.get(id);
}

export async function savePick(pick: Pick): Promise<void> {
  await db.picks.put(pick);
}

export async function removePick(id: string): Promise<void> {
  await db.picks.delete(id);
}

export async function countPicks(): Promise<number> {
  return db.picks.count();
}

/** バトルを始めたときに呼ぶ。「よくつかう順」の並べ替えに使う */
export async function incrementUseCount(ids: string[]): Promise<void> {
  await db.transaction('rw', db.picks, async () => {
    for (const id of ids) {
      const pick = await db.picks.get(id);
      if (pick) await db.picks.put({ ...pick, useCount: pick.useCount + 1 });
    }
  });
}
