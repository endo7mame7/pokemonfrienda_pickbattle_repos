import { describe, expect, it } from 'vitest';
import {
  battleReducer,
  createBattle,
  diceCountForTurn,
  isAlive,
  isTeamWipedOut,
  mvpOf,
  selectedAttacker,
  type BattleAction,
  type BattleState,
} from '../battle';
import { MOVE_NAMES } from '../moves';
import { OPPONENT_OF } from '../types';
import { makePick, makeSettings } from './testHelpers';

// ここまでのテストは サイコロ方式 の検証。タイミング方式は下の describe で
const settings = makeSettings({
  attackStyle: 'dice',
  damageMultiplier: 20,
  superEffectiveBonus: 20,
});
// メガシンカの検証では、つかれによる半減で発動ラインがぼやけないよう切っておく
const megaSettings = makeSettings({
  attackStyle: 'dice',
  damageMultiplier: 20,
  fatigueEnabled: false,
});

function apply(state: BattleState, ...actions: BattleAction[]): BattleState {
  return actions.reduce(battleReducer, state);
}

/**
 * 攻撃を1回だけ最後まで進める（phase は resolve で止まる）。
 * サイコロを振ったあと、攻撃エフェクトぶんの 'next' でダメージが当たる。
 */
function attack(state: BattleState, attackerIndex: number, targetIndex: number, rolls: number[]) {
  return apply(
    state,
    { type: 'selectAttacker', index: attackerIndex },
    { type: 'selectTarget', index: targetIndex },
    { type: 'rollDice', rolls },
    { type: 'next' },
  );
}

/** resolve から相手のターンへ進める */
function handOff(state: BattleState): BattleState {
  return apply(state, { type: 'next' }, { type: 'next' });
}

/** 相手に軽く1回攻撃させて、手番を自分に戻す（メガシンカを聞かれたら断る） */
function opponentTurn(state: BattleState): BattleState {
  let afterHandOff = handOff(state);
  if (afterHandOff.phase === 'megaPrompt') {
    afterHandOff = battleReducer(afterHandOff, { type: 'declineMega' });
  }
  const attackerIndex = afterHandOff.teams[afterHandOff.turnPlayer].findIndex(isAlive);
  const targetIndex = afterHandOff.teams[OPPONENT_OF[afterHandOff.turnPlayer]].findIndex(isAlive);
  const withSelection = apply(
    afterHandOff,
    { type: 'selectAttacker', index: attackerIndex },
    { type: 'selectTarget', index: targetIndex },
  );
  const rolls = Array.from({ length: diceCountForTurn(withSelection) }, () => 1);
  const hit = apply(withSelection, { type: 'rollDice', rolls }, { type: 'next' });
  return handOff(hit);
}

describe('バトルの進行', () => {
  it('コイントスで決まったプレイヤーから始まる', () => {
    const state = createBattle([makePick()], [makePick()], 'p2', settings);
    expect(state.turnPlayer).toBe('p2');
    expect(state.phase).toBe('selectAttacker');
    expect(state.turnCount).toBe(1);
  });

  it('こうげきする子 → ねらう子 → サイコロ の順に進む', () => {
    let state = createBattle([makePick()], [makePick()], 'p1', settings);
    state = battleReducer(state, { type: 'selectAttacker', index: 0 });
    expect(state.phase).toBe('selectTarget');
    state = battleReducer(state, { type: 'selectTarget', index: 0 });
    expect(state.phase).toBe('rollDice');
    state = battleReducer(state, { type: 'rollDice', rolls: [3] });
    expect(state.phase).toBe('attacking'); // まだ当たっていない
    state = battleReducer(state, { type: 'next' });
    expect(state.phase).toBe('resolve');
  });

  it('サイコロを振るまでは選択をやり直せる（U-6）', () => {
    let state = createBattle([makePick(), makePick()], [makePick()], 'p1', settings);
    state = apply(
      state,
      { type: 'selectAttacker', index: 0 },
      { type: 'selectTarget', index: 0 },
      { type: 'clearSelection' },
    );
    expect(state.phase).toBe('selectAttacker');
    expect(state.selectedAttackerIndex).toBeNull();
    expect(state.selectedTargetIndex).toBeNull();
  });

  it('攻撃する子を選び直せる', () => {
    let state = createBattle([makePick(), makePick()], [makePick()], 'p1', settings);
    state = apply(
      state,
      { type: 'selectAttacker', index: 0 },
      { type: 'selectAttacker', index: 1 },
    );
    expect(state.selectedAttackerIndex).toBe(1);
  });

  it('サイコロを振っただけでは、まだ たいりょくは へらない（エフェクトを見せる間）', () => {
    const state = apply(
      createBattle([makePick()], [makePick({ energy: 200 })], 'p1', settings),
      { type: 'selectAttacker', index: 0 },
      { type: 'selectTarget', index: 0 },
      { type: 'rollDice', rolls: [3] },
    );
    expect(state.phase).toBe('attacking');
    expect(state.teams.p2[0]!.hp).toBe(200); // まだ当たっていない
    expect(state.lastResult?.damage).toBe(60); // ダメージは計算ずみ

    // エフェクトが終わってから当たる
    const hit = battleReducer(state, { type: 'next' });
    expect(hit.phase).toBe('resolve');
    expect(hit.teams.p2[0]!.hp).toBe(140);
  });

  it('エフェクトに使う こうげきタイプ と ねらった相手 が結果に入る', () => {
    const state = attack(
      createBattle(
        [makePick({ type: 'ほのお' })],
        [makePick(), makePick({ name: 'ねらわれた子' })],
        'p1',
        settings,
      ),
      0,
      1,
      [3],
    );
    expect(state.lastResult?.attackerType).toBe('ほのお');
    expect(state.lastResult?.targetIndex).toBe(1);
    expect(state.lastResult?.targetName).toBe('ねらわれた子');
  });

  it('ダメージが相手のたいりょくから引かれる', () => {
    const state = attack(
      createBattle([makePick()], [makePick({ energy: 200 })], 'p1', settings),
      0,
      0,
      [3],
    );
    expect(state.teams.p2[0]!.hp).toBe(140); // 200 - 60
    expect(state.lastResult?.damage).toBe(60);
  });

  it('たいりょくはマイナスにならない', () => {
    const state = attack(
      createBattle([makePick()], [makePick({ energy: 100 })], 'p1', settings),
      0,
      0,
      [6],
    );
    expect(state.teams.p2[0]!.hp).toBe(0);
    expect(state.lastResult?.targetFainted).toBe(true);
  });

  it('攻撃が終わると相手に手番が渡る', () => {
    let state = attack(createBattle([makePick()], [makePick()], 'p1', settings), 0, 0, [1]);
    state = battleReducer(state, { type: 'next' });
    expect(state.phase).toBe('handOff');
    state = battleReducer(state, { type: 'next' });
    expect(state.turnPlayer).toBe('p2');
    expect(state.turnCount).toBe(2);
    expect(state.phase).toBe('selectAttacker');
  });

  it('ひんしのポケモンは攻撃にも攻撃対象にも選べない', () => {
    let state = createBattle([makePick()], [makePick({ energy: 10 }), makePick()], 'p1', settings);
    state = handOff(attack(state, 0, 0, [6])); // p2 の1体目をたおして p2 の手番へ
    expect(state.teams.p2[0]!.hp).toBe(0);
    expect(state.turnPlayer).toBe('p2');

    // ひんしのポケモンでは攻撃できない
    expect(battleReducer(state, { type: 'selectAttacker', index: 0 }).selectedAttackerIndex).toBeNull();
    // 生きている子は選べる
    state = battleReducer(state, { type: 'selectAttacker', index: 1 });
    expect(state.selectedAttackerIndex).toBe(1);

    // p1 の手番に戻すと、たおした相手はもう狙えない
    state = handOff(
      apply(
        state,
        { type: 'selectTarget', index: 0 },
        { type: 'rollDice', rolls: [1] },
        { type: 'next' }, // 攻撃エフェクトぶん
      ),
    );
    expect(state.turnPlayer).toBe('p1');
    const afterTarget = apply(
      state,
      { type: 'selectAttacker', index: 0 },
      { type: 'selectTarget', index: 0 },
    );
    expect(afterTarget.selectedTargetIndex).toBeNull();
  });

  it('相手が全滅したら勝ち', () => {
    let state = attack(
      createBattle([makePick()], [makePick({ energy: 10 })], 'p1', settings),
      0,
      0,
      [6],
    );
    state = battleReducer(state, { type: 'next' });
    expect(state.phase).toBe('finished');
    expect(state.winner).toBe('p1');
  });

  it('こうげきされただけでは かってに メガシンカ しない', () => {
    const state = attack(
      createBattle(
        [makePick()],
        [makePick({ energy: 300, canMegaEvolve: true })],
        'p1',
        megaSettings,
      ),
      0,
      0,
      [5, 5], // 200ダメージ → hp 100 = 300 の ちょうど 1/3
    );
    expect(state.teams.p2[0]!.hp).toBe(100);
    expect(state.teams.p2[0]!.megaEvolved).toBe(false);
  });

  it('たいりょくが へると、自分のターンのはじめに メガシンカ するか きかれる', () => {
    let state = createBattle(
      [makePick()],
      [makePick({ energy: 300, canMegaEvolve: true })],
      'p1',
      megaSettings,
    );
    // はじめは だれも メガシンカ できない
    expect(state.phase).toBe('selectAttacker');

    state = handOff(attack(state, 0, 0, [5, 5])); // hp 100（ちょうど 1/3）
    expect(state.turnPlayer).toBe('p2');
    expect(state.phase).toBe('megaPrompt');
    expect(state.megaCandidateIndex).toBe(0);
  });

  it('「する」を選ぶと メガシンカ して、サイコロが2個になる', () => {
    let state = handOff(
      attack(
        createBattle([makePick()], [makePick({ energy: 300, canMegaEvolve: true })], 'p1', megaSettings),
        0,
        0,
        [5, 5],
      ),
    );
    state = battleReducer(state, { type: 'megaEvolve' });
    expect(state.phase).toBe('megaEvolving'); // 演出を見せる
    expect(state.teams.p2[0]!.megaEvolved).toBe(true);

    state = battleReducer(state, { type: 'next' }); // 演出おわり
    expect(state.phase).toBe('selectAttacker');

    state = battleReducer(state, { type: 'selectAttacker', index: 0 });
    expect(selectedAttacker(state)?.megaEvolved).toBe(true);
    expect(diceCountForTurn(state)).toBe(2);
  });

  it('「いまはしない」を選ぶと メガシンカ せずに こうげきに進む', () => {
    let state = handOff(
      attack(
        createBattle([makePick()], [makePick({ energy: 300, canMegaEvolve: true })], 'p1', megaSettings),
        0,
        0,
        [5, 5],
      ),
    );
    state = battleReducer(state, { type: 'declineMega' });
    expect(state.phase).toBe('selectAttacker');
    expect(state.teams.p2[0]!.megaEvolved).toBe(false);
    expect(state.megaCandidateIndex).toBeNull();
  });

  it('ことわっても、つぎの自分のターンに また きかれる', () => {
    let state = handOff(
      attack(
        createBattle([makePick()], [makePick({ energy: 300, canMegaEvolve: true })], 'p1', megaSettings),
        0,
        0,
        [5, 5],
      ),
    );
    state = battleReducer(state, { type: 'declineMega' });
    // p2 が1回こうげきして、p1 をはさんで p2 の手番に戻す
    state = handOff(attack(state, 0, 0, [1]));
    state = handOff(attack(state, 0, 0, [1]));
    expect(state.turnPlayer).toBe('p2');
    expect(state.phase).toBe('megaPrompt');
  });

  it('2体できるときは、1体ずつ きかれる', () => {
    const weak = () => makePick({ energy: 300, canMegaEvolve: true });
    let state = createBattle([makePick()], [weak(), weak()], 'p1', megaSettings);
    state = handOff(attack(state, 0, 0, [5, 5])); // p2 の1体目が 1/3 に
    state = battleReducer(state, { type: 'megaEvolve' });
    state = battleReducer(state, { type: 'next' });
    // 2体目はまだ元気なので、もう聞かれない
    expect(state.phase).toBe('selectAttacker');

    // 2体目（index 1）も減らすと、次のターンに聞かれる
    state = handOff(attack(state, 0, 0, [1])); // p2 のターン
    state = handOff(attack(state, 0, 1, [5, 5])); // p1 が p2 の2体目をねらう
    expect(state.teams.p2[1]!.hp).toBe(100);
    expect(state.phase).toBe('megaPrompt');
    expect(state.megaCandidateIndex).toBe(1);
  });

  it('つかれた状態で攻撃するとダメージが半分になる（サイコロ方式）', () => {
    // つかれは 交代できるとき だけ。2体いる状態で ためす
    let state = createBattle(
      [makePick(), makePick()],
      [makePick({ energy: 350 })],
      'p1',
      settings,
    );
    state = attack(state, 0, 0, [3]); // 全力 60
    expect(state.lastResult?.damage).toBe(60);
    expect(state.teams.p1[0]!.tired).toBe(true);

    state = opponentTurn(state);
    state = attack(state, 0, 0, [3]); // つかれて 30
    expect(state.lastResult?.damage).toBe(30);
    expect(state.lastResult?.isTired).toBe(true);
    // つかれは 休まないと とれない
    expect(state.teams.p1[0]!.tired).toBe(true);
  });

  it('つかれは 休んだときだけ とれる', () => {
    let state = createBattle(
      [makePick({ name: 'A' }), makePick({ name: 'B' })],
      [makePick({ energy: 350 })],
      'p1',
      settings,
    );
    state = opponentTurn(attack(state, 0, 0, [1])); // A が攻撃 → つかれる
    expect(state.teams.p1[0]!.tired).toBe(true);

    state = opponentTurn(attack(state, 1, 0, [1])); // B が攻撃 → A は休んで回復
    expect(state.teams.p1[0]!.tired).toBe(false);
    expect(state.teams.p1[1]!.tired).toBe(true);
  });

  it('1体だけになったら つかれない（交代できないため）', () => {
    let state = createBattle(
      [makePick(), makePick({ energy: 10 })],
      [makePick({ energy: 350 })],
      'p1',
      settings,
    );
    state = opponentTurn(attack(state, 0, 0, [3]));
    expect(state.teams.p1[0]!.tired).toBe(true); // まだ2体いるので つかれる

    // 2体目を たおして 1体だけにする
    state.teams.p1[1]!.hp = 0;
    state = opponentTurn(attack(state, 0, 0, [3]));
    expect(state.teams.p1[0]!.tired).toBe(false);
  });

  it('MVP はいちばん多くダメージを与えた子', () => {
    let state = createBattle(
      [makePick({ name: 'A' }), makePick({ name: 'B' })],
      [makePick({ energy: 350 })],
      'p1',
      settings,
    );
    state = opponentTurn(attack(state, 0, 0, [2])); // A: 40
    state = attack(state, 1, 0, [5]); // B: 100
    expect(mvpOf(state.teams.p1)?.name).toBe('B');
  });
});

describe('タイミング方式の進行', () => {
  const timingSettings = makeSettings({ attackStyle: 'timing', superEffectiveBonus: 20 });

  const start = () =>
    apply(
      createBattle([makePick()], [makePick({ energy: 350 })], 'p1', timingSettings),
      { type: 'selectAttacker', index: 0 },
      { type: 'selectTarget', index: 0 },
    );

  it('ねらう子をえらぶと、つぎは わざ えらび（サイコロではない）', () => {
    expect(start().phase).toBe('chooseMove');
  });

  it('わざをえらぶと ゲージ、止めると こうげき', () => {
    let state = battleReducer(start(), { type: 'chooseMove', move: 'strong' });
    expect(state.phase).toBe('timing');
    expect(state.selectedMove).toBe('strong');

    state = battleReducer(state, { type: 'stopTiming', position: 0.5 });
    expect(state.phase).toBe('attacking');
    expect(state.lastResult?.timing).toBe('perfect');
    expect(state.lastResult?.moveName).toBeTruthy();
  });

  it('まんなかで止めるほど ダメージが大きい', () => {
    const damageAt = (position: number) => {
      const state = apply(
        battleReducer(start(), { type: 'chooseMove', move: 'normal' }),
        { type: 'stopTiming', position },
      );
      return state.lastResult!.damage;
    };
    expect(damageAt(0.5)).toBeGreaterThan(damageAt(0.7));
    expect(damageAt(0.7)).toBeGreaterThan(damageAt(0.05));
  });

  it('わざの名前は タイプと わざの種類で決まる', () => {
    const fire = apply(
      createBattle([makePick({ type: 'ほのお' })], [makePick()], 'p1', timingSettings),
      { type: 'selectAttacker', index: 0 },
      { type: 'selectTarget', index: 0 },
      { type: 'chooseMove', move: 'strong' },
      { type: 'stopTiming', position: 0.5 },
    );
    expect(fire.lastResult?.moveName).toBe(MOVE_NAMES.ほのお.strong);
  });

  it('ゲージを止めるまでは えらびなおせる', () => {
    const state = battleReducer(start(), { type: 'clearSelection' });
    expect(state.phase).toBe('selectAttacker');
    expect(state.selectedMove).toBeNull();
  });

  it('タイミング方式では サイコロを振っても なにも起きない', () => {
    const state = battleReducer(start(), { type: 'rollDice', rolls: [6] });
    expect(state.phase).toBe('chooseMove');
  });
});

describe('メガわざ は ちからを つかいきる（docs/SPEC.md §3.6）', () => {
  const timingSettings = makeSettings({
    attackStyle: 'timing',
    fatigueEnabled: false,
    megaThreshold: 'half',
  });

  /** あいてに 1発もらって たいりょくを へらし、p1 を メガシンカ ずみ にする */
  function megaReady() {
    let state = createBattle(
      [makePick({ canMegaEvolve: true, energy: 400 })],
      [makePick({ energy: 3000 })],
      'p2', // あいてが さきに こうげき する
      timingSettings,
    );
    state = apply(
      state,
      ...timingTurn('normal', 0.5), // ぴったり。p1 は はんぶん 以下 になる
    );
    expect(state.phase).toBe('megaPrompt');
    state = apply(state, { type: 'megaEvolve' }, { type: 'next' });
    expect(state.teams.p1[0]!.megaEvolved).toBe(true);
    return state;
  }

  /** 1vs1 で 1ターンぶん（わざ えらび 〜 つぎの手番のはじめ まで）進める */
  function timingTurn(move: 'normal' | 'strong', position: number): BattleAction[] {
    return [
      { type: 'selectAttacker', index: 0 },
      { type: 'selectTarget', index: 0 },
      { type: 'chooseMove', move },
      { type: 'stopTiming', position },
      { type: 'next' }, // attacking → resolve
      { type: 'next' }, // resolve → handOff
      { type: 'next' }, // handOff → あいての ターン
    ];
  }

  it('メガシンカ中だけ メガわざ を えらべる', () => {
    const normal = apply(
      createBattle([makePick()], [makePick({ energy: 900 })], 'p1', timingSettings),
      { type: 'selectAttacker', index: 0 },
      { type: 'selectTarget', index: 0 },
      { type: 'chooseMove', move: 'mega' },
    );
    expect(normal.phase).toBe('chooseMove'); // えらべない

    const mega = apply(
      megaReady(),
      { type: 'selectAttacker', index: 0 },
      { type: 'selectTarget', index: 0 },
      { type: 'chooseMove', move: 'mega' },
    );
    expect(mega.phase).toBe('mashing');
  });

  it('メガわざ を うつと メガシンカ が とける', () => {
    const state = apply(
      megaReady(),
      { type: 'selectAttacker', index: 0 },
      { type: 'selectTarget', index: 0 },
      { type: 'chooseMove', move: 'mega' },
      { type: 'finishMash', fill: 1 },
      { type: 'next' },
    );
    expect(state.lastResult?.megaEnded).toBe(true);
    expect(state.teams.p1[0]!.megaEvolved).toBe(false);
    expect(state.teams.p1[0]!.megaUsed).toBe(true);
  });

  it('ふつう・つよい わざ では メガシンカ は とけない', () => {
    for (const move of ['normal', 'strong'] as const) {
      const state = apply(
        megaReady(),
        { type: 'selectAttacker', index: 0 },
        { type: 'selectTarget', index: 0 },
        { type: 'chooseMove', move },
        { type: 'stopTiming', position: 0.5 },
        { type: 'next' },
      );
      expect(state.lastResult?.megaEnded).toBe(false);
      expect(state.teams.p1[0]!.megaEvolved).toBe(true);
    }
  });

  it('つかいきったら もう一度は メガシンカ できない', () => {
    let state = apply(
      megaReady(),
      { type: 'selectAttacker', index: 0 },
      { type: 'selectTarget', index: 0 },
      { type: 'chooseMove', move: 'mega' },
      { type: 'finishMash', fill: 1 },
      { type: 'next' }, // attacking → resolve
      { type: 'next' }, // resolve → handOff
      { type: 'next' }, // handOff → あいての ターン
    );
    // あいての ターン は わざと はずして、p1 が たおれないようにする
    state = apply(state, ...timingTurn('normal', 0));

    expect(state.turnPlayer).toBe('p1');
    const self = state.teams.p1[0]!;
    // たいりょくは まだ はんぶん 以下 なのに、もう きかれない
    expect(self.hp).toBeGreaterThan(0);
    expect(self.hp * 2).toBeLessThanOrEqual(self.maxHp);
    expect(state.megaCandidateIndex).toBeNull();
    expect(state.phase).toBe('selectAttacker');
  });
});

describe('1バトルを最後まで完走できる（P0の完了条件）', () => {
  /** 再現可能な擬似乱数（テストが毎回同じ結果になるように） */
  function makeRng(seed: number) {
    let value = seed;
    return () => {
      value = (value * 1664525 + 1013904223) % 4294967296;
      return value / 4294967296;
    };
  }

  function playToEnd(seed: number, teamSize: number) {
    const rng = makeRng(seed);
    const rollDie = () => Math.floor(rng() * 6) + 1;
    const makeTeam = () =>
      Array.from({ length: teamSize }, () =>
        makePick({
          energy: (Math.floor(rng() * 21) + 15) * 10,
          canMegaEvolve: rng() < 0.4,
        }),
      );

    let state = createBattle(makeTeam(), makeTeam(), 'p1', settings);
    let guard = 0;

    while (state.phase !== 'finished') {
      guard += 1;
      if (guard > 500) throw new Error('バトルが終わらない');

      if (state.phase === 'megaPrompt') {
        // できるときは必ず メガシンカ する
        state = battleReducer(state, { type: 'megaEvolve' });
      } else if (state.phase === 'megaEvolving') {
        state = battleReducer(state, { type: 'next' });
      } else if (state.phase === 'attacking') {
        state = battleReducer(state, { type: 'next' });
      } else if (state.phase === 'selectAttacker') {
        const team = state.teams[state.turnPlayer];
        // つかれていない子を優先して選ぶ（交代して戦う）
        const fresh = team.findIndex((p) => isAlive(p) && !p.tired);
        const index = fresh >= 0 ? fresh : team.findIndex(isAlive);
        state = battleReducer(state, { type: 'selectAttacker', index });
      } else if (state.phase === 'selectTarget') {
        const index = state.teams[OPPONENT_OF[state.turnPlayer]].findIndex(isAlive);
        state = battleReducer(state, { type: 'selectTarget', index });
      } else if (state.phase === 'rollDice') {
        const rolls = Array.from({ length: diceCountForTurn(state) }, rollDie);
        state = battleReducer(state, { type: 'rollDice', rolls });
      } else {
        state = battleReducer(state, { type: 'next' });
      }
    }
    return state;
  }

  it.each([1, 2, 3])('%ivs%i が決着する', (teamSize) => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const state = playToEnd(seed, teamSize);
      expect(state.winner).not.toBeNull();
      expect(isTeamWipedOut(state.teams[OPPONENT_OF[state.winner!]])).toBe(true);
      // 勝った側は1体以上生き残っている
      expect(state.teams[state.winner!].some(isAlive)).toBe(true);
      // たいりょくが負になっていない
      for (const team of [state.teams.p1, state.teams.p2]) {
        for (const pokemon of team) expect(pokemon.hp).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('3vs3 のターン数がバランス検証の想定（平均21ターン前後）に収まる', () => {
    const turnCounts = Array.from({ length: 60 }, (_, i) => playToEnd(i + 100, 3).turnCount);
    const average = turnCounts.reduce((a, b) => a + b, 0) / turnCounts.length;
    expect(average).toBeGreaterThan(14);
    expect(average).toBeLessThan(28);
  });
});
