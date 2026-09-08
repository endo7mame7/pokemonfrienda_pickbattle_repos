import { db } from './db';
import { DEFAULT_SETTINGS } from '../domain';
import type { Settings } from '../domain';

const KEY = 'settings';

/** 保存されていない項目は、そのときの初期値でおぎなう（設定を足しても壊れない） */
export async function loadSettings(): Promise<Settings> {
  const row = await db.settings.get(KEY);
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings> | undefined) ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await db.settings.put({ key: KEY, value: settings });
}
