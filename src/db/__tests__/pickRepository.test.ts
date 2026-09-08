import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import {
  applyInput,
  countPicks,
  createPick,
  incrementUseCount,
  listPicks,
  removePick,
  savePick,
} from '../pickRepository';
import type { PickInput } from '../pickRepository';

const base: PickInput = {
  name: 'ピカチュウ',
  type: 'でんき',
  energy: 180,
  canMegaEvolve: false,
};

beforeEach(async () => {
  await db.picks.clear();
});

describe('ピックの保存', () => {
  it('とうろくすると、あとから読みだせる', async () => {
    const pick = createPick(base);
    await savePick(pick);

    const saved = await listPicks();
    expect(saved).toHaveLength(1);
    expect(saved[0]!.name).toBe('ピカチュウ');
    expect(saved[0]!.energy).toBe(180);
  });

  it('かげの形も いっしょに保存できる', async () => {
    await savePick(createPick({ ...base, silhouette: 'まる' }));

    const [saved] = await listPicks();
    expect(saved!.silhouette).toBe('まる');
  });

  it('けすと なくなる', async () => {
    const pick = createPick(base);
    await savePick(pick);
    await removePick(pick.id);
    expect(await countPicks()).toBe(0);
  });

  it('id はピックごとに ちがう', () => {
    expect(createPick(base).id).not.toBe(createPick(base).id);
  });
});

describe('ピックの書きかえ', () => {
  it('なまえや つよさを かきかえられる', () => {
    const pick = createPick(base, 1000);
    const updated = applyInput(pick, { ...base, name: 'ライチュウ', energy: 260 }, 2000);

    expect(updated.id).toBe(pick.id);
    expect(updated.name).toBe('ライチュウ');
    expect(updated.energy).toBe(260);
    expect(updated.createdAt).toBe(1000); // とうろくした日は変わらない
    expect(updated.updatedAt).toBe(2000);
  });

  it('使用回数は かきかえても へらない', () => {
    const pick = { ...createPick(base), useCount: 7 };
    expect(applyInput(pick, base).useCount).toBe(7);
  });

  it('かげの形を えらびなおさないと、ちゃんと消える', () => {
    const pick = createPick({ ...base, silhouette: 'まる' });
    expect(applyInput(pick, base).silhouette).toBeUndefined();
  });
});

describe('ならべかえ', () => {
  beforeEach(async () => {
    await savePick({ ...createPick({ ...base, name: 'アアア', energy: 150 }, 300), useCount: 1 });
    await savePick({ ...createPick({ ...base, name: 'ンンン', energy: 350 }, 100), useCount: 5 });
    await savePick({ ...createPick({ ...base, name: 'ナナナ', energy: 250 }, 200), useCount: 3 });
  });

  it('よくつかう順', async () => {
    const names = (await listPicks('useCount')).map((pick) => pick.name);
    expect(names).toEqual(['ンンン', 'ナナナ', 'アアア']);
  });

  it('なまえ順', async () => {
    const names = (await listPicks('name')).map((pick) => pick.name);
    expect(names).toEqual(['アアア', 'ナナナ', 'ンンン']);
  });

  it('つよさ順（エネルギー値の大きい順）', async () => {
    const energies = (await listPicks('energy')).map((pick) => pick.energy);
    expect(energies).toEqual([350, 250, 150]);
  });

  it('とうろくした順', async () => {
    const names = (await listPicks('createdAt')).map((pick) => pick.name);
    expect(names).toEqual(['ンンン', 'ナナナ', 'アアア']);
  });
});

describe('使用回数', () => {
  it('バトルに出したぶんだけ ふえる', async () => {
    const a = createPick({ ...base, name: 'A' });
    const b = createPick({ ...base, name: 'B' });
    await savePick(a);
    await savePick(b);

    await incrementUseCount([a.id, b.id]);
    await incrementUseCount([a.id]);

    const picks = await listPicks('name');
    expect(picks.find((p) => p.name === 'A')!.useCount).toBe(2);
    expect(picks.find((p) => p.name === 'B')!.useCount).toBe(1);
  });

  it('ないIDがまざっても こわれない', async () => {
    const pick = createPick(base);
    await savePick(pick);
    await expect(incrementUseCount([pick.id, 'いないID'])).resolves.toBeUndefined();
  });
});
