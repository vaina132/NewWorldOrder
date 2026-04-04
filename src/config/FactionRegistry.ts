/**
 * Faction registry — central access point for all faction data.
 * Use registerFaction() to add factions, getFaction() to retrieve.
 */

import type { FactionId } from '@/utils/Types';
import type { UnitConfig } from '@/entities/Unit';
import type { BuildingConfig } from '@/entities/Building';

export interface FactionData {
  id: FactionId;
  name: string;
  color: { primary: number; secondary: number; accent: number };
  economyBonus: string;
  units: Record<string, UnitConfig>;
  buildings: Record<string, BuildingConfig>;
}

const factions = new Map<FactionId, FactionData>();

export function registerFaction(data: FactionData): void {
  factions.set(data.id, data);
}

export function getFaction(id: FactionId): FactionData {
  const data = factions.get(id);
  if (!data) throw new Error(`Faction "${id}" not registered`);
  return data;
}

export function getAllFactions(): FactionData[] {
  return [...factions.values()];
}
