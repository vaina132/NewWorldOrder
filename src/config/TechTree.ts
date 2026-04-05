/**
 * Tech Tree — Building prerequisites for each faction.
 * Defines which buildings must exist before others can be built.
 * Also defines which buildings unlock which unit production.
 */

import type { FactionId } from '@/utils/Types';

export interface TechRequirement {
  requires: string[];  // building types that must exist
}

/** Building prerequisites — both factions share similar structure */
const SHARED_BUILDING_PREREQS: Record<string, TechRequirement> = {
  construction_yard: { requires: [] },
  power_plant: { requires: ['construction_yard'] },
  tesla_reactor: { requires: ['construction_yard'] },
  ore_refinery: { requires: ['construction_yard', 'power_plant'] },
  barracks: { requires: ['construction_yard', 'power_plant'] },
  war_factory: { requires: ['barracks'] },
  naval_yard: { requires: ['war_factory'] },
  air_force_command: { requires: ['war_factory'] },
  radar_tower: { requires: ['war_factory'] },
  battle_lab: { requires: ['war_factory'] },
  ore_purifier: { requires: ['battle_lab', 'ore_refinery'] },
  nuclear_reactor: { requires: ['battle_lab'] },
  // Defences
  wall: { requires: ['construction_yard'] },
  pillbox: { requires: ['barracks'] },
  sentry_gun: { requires: ['barracks'] },
  prism_tower: { requires: ['battle_lab'] },
  tesla_coil: { requires: ['battle_lab'] },
  patriot_missile: { requires: ['air_force_command'] },
  flak_cannon: { requires: ['radar_tower'] },
};

/** Unit production requirements — which building must own to produce */
const UNIT_PRODUCTION_REQS: Record<string, TechRequirement> = {
  // AC Infantry
  rifleman: { requires: ['barracks'] },
  engineer: { requires: ['barracks'] },
  // AC Vehicles
  chrono_harvester: { requires: ['war_factory', 'ore_refinery'] },
  light_tank: { requires: ['war_factory'] },
  ifv: { requires: ['war_factory'] },
  prism_tank: { requires: ['war_factory', 'battle_lab'] },
  // AC Aircraft
  raptor: { requires: ['air_force_command'] },
  nighthawk: { requires: ['air_force_command', 'battle_lab'] },
  // IP Infantry
  conscript: { requires: ['barracks'] },
  flak_trooper: { requires: ['barracks'] },
  rpg_trooper: { requires: ['barracks'] },
  // IP Vehicles
  war_harvester: { requires: ['war_factory', 'ore_refinery'] },
  heavy_tank: { requires: ['war_factory'] },
  apocalypse_tank: { requires: ['war_factory', 'battle_lab'] },
  v3_launcher: { requires: ['war_factory'] },
  // IP Aircraft
  mig: { requires: ['radar_tower'] },
};

/** Check if a player has the prerequisites for a building */
export function canBuildStructure(
  buildingType: string,
  ownedBuildingTypes: Set<string>,
): boolean {
  const req = SHARED_BUILDING_PREREQS[buildingType];
  if (!req) return false;
  return req.requires.every(r => ownedBuildingTypes.has(r));
}

/** Check if a player can produce a unit type */
export function canProduceUnit(
  unitType: string,
  ownedBuildingTypes: Set<string>,
): boolean {
  const req = UNIT_PRODUCTION_REQS[unitType];
  if (!req) return false;
  return req.requires.every(r => ownedBuildingTypes.has(r));
}

/** Get all building types a player can currently build */
export function getAvailableBuildings(
  factionId: FactionId,
  ownedBuildingTypes: Set<string>,
): string[] {
  return Object.keys(SHARED_BUILDING_PREREQS).filter(type =>
    canBuildStructure(type, ownedBuildingTypes)
  );
}

/** Get all unit types a player can currently produce */
export function getAvailableUnits(
  factionId: FactionId,
  ownedBuildingTypes: Set<string>,
): string[] {
  return Object.keys(UNIT_PRODUCTION_REQS).filter(type =>
    canProduceUnit(type, ownedBuildingTypes)
  );
}

/** Get the prerequisite text for a building/unit (for tooltips) */
export function getPrereqText(typeId: string): string {
  const req = SHARED_BUILDING_PREREQS[typeId] ?? UNIT_PRODUCTION_REQS[typeId];
  if (!req || req.requires.length === 0) return '';
  return `Requires: ${req.requires.map(r => r.replace(/_/g, ' ')).join(', ')}`;
}
