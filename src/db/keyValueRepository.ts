import { db } from './db';
import type { PlayerId } from '../domain';

const LAST_TEAMS_KEY = 'lastTeams';

export type LastTeams = Partial<Record<PlayerId, string[]>>;

/** 「まえとおなじ」で呼び出すために、直前の編成をおぼえておく */
export async function loadLastTeams(): Promise<LastTeams> {
  const row = await db.settings.get(LAST_TEAMS_KEY);
  return (row?.value as LastTeams | undefined) ?? {};
}

export async function saveLastTeams(teams: LastTeams): Promise<void> {
  await db.settings.put({ key: LAST_TEAMS_KEY, value: teams });
}
