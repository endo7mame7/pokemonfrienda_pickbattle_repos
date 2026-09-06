/** サイコロを振る関数。テストでは固定の出目を差し込めるようにしておく */
export type RollDie = () => number;

export const randomDie: RollDie = () => Math.floor(Math.random() * 6) + 1;

/** メガシンカ中はサイコロが2個になる */
export function diceCountFor(megaEvolved: boolean): number {
  return megaEvolved ? 2 : 1;
}

export function rollDice(count: number, roll: RollDie = randomDie): number[] {
  return Array.from({ length: count }, roll);
}
