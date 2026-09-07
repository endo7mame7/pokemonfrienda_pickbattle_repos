import { db } from './db';
import type { TeamPreset } from '../domain';

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `preset-${Date.now()}`;
}

export async function listTeamPresets(): Promise<TeamPreset[]> {
  const presets = await db.teamPresets.toArray();
  return presets.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveTeamPreset(name: string, pickIds: string[]): Promise<TeamPreset> {
  const preset: TeamPreset = { id: newId(), name, pickIds, updatedAt: Date.now() };
  await db.teamPresets.put(preset);
  return preset;
}

export async function removeTeamPreset(id: string): Promise<void> {
  await db.teamPresets.delete(id);
}
