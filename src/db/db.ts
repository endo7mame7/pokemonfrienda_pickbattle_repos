import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Pick, PlayerId, TeamPreset } from '../domain';

export interface SettingsRow {
  key: string;
  value: unknown;
}

export interface BattleLog {
  id?: number;
  finishedAt: number;
  winner: PlayerId;
  turnCount: number;
}

/**
 * ずかんのデータベース（docs/SPEC.md §10.2）。
 *
 * スキーマを変えるときは、かならず version(n+1) を足す。
 * 登録し直しは保護者にとって最大の苦痛なので、既存のデータを消さずに
 * アプリを更新できることを保証する。
 */
export class PickBattleDB extends Dexie {
  picks!: Table<Pick, string>;
  teamPresets!: Table<TeamPreset, string>;
  settings!: Table<SettingsRow, string>;
  battleLogs!: Table<BattleLog, number>;

  constructor(name = 'pickbattle') {
    super(name);
    this.version(1).stores({
      picks: 'id, name, type, energy, useCount, updatedAt',
      teamPresets: 'id, updatedAt',
      settings: 'key',
      battleLogs: '++id, finishedAt',
    });
  }
}

export const db = new PickBattleDB();
