/**
 * Iron Pact (IP) — Red faction.
 * Playstyle: Brute force, swarm, early aggression.
 */

import { registerFaction, type FactionData } from '@/config/FactionRegistry';
import { FACTION_COLORS } from '@/config/GameConfig';

export const IRON_PACT: FactionData = {
  id: 'ip',
  name: 'Iron Pact',
  color: FACTION_COLORS.ip,
  economyBonus: 'Industrial Foundry (+25% vehicle build speed)',

  buildings: {
    construction_yard: {
      buildingType: 'construction_yard', maxHp: 1500, footprintW: 3, footprintH: 3,
      powerProduced: 0, powerConsumed: 0, cost: 3000, buildTime: 0,
      spriteKey: 'ip_tesla_reactor', sightRange: 10,
    },
    tesla_reactor: {
      buildingType: 'tesla_reactor', maxHp: 750, footprintW: 2, footprintH: 2,
      powerProduced: 150, powerConsumed: 0, cost: 600, buildTime: 10,
      spriteKey: 'ip_tesla_reactor', sightRange: 5,
    },
    ore_refinery: {
      buildingType: 'ore_refinery', maxHp: 900, footprintW: 3, footprintH: 3,
      powerProduced: 0, powerConsumed: 50, cost: 2000, buildTime: 15,
      spriteKey: 'ip_tesla_reactor', sightRange: 6,
    },
    barracks: {
      buildingType: 'barracks', maxHp: 800, footprintW: 2, footprintH: 2,
      powerProduced: 0, powerConsumed: 10, cost: 500, buildTime: 8,
      spriteKey: 'ip_tesla_reactor', sightRange: 5,
    },
    war_factory: {
      buildingType: 'war_factory', maxHp: 1000, footprintW: 3, footprintH: 3,
      powerProduced: 0, powerConsumed: 25, cost: 2000, buildTime: 20,
      spriteKey: 'ip_tesla_reactor', sightRange: 5,
    },
    naval_yard: {
      buildingType: 'naval_yard', maxHp: 800, footprintW: 3, footprintH: 3,
      powerProduced: 0, powerConsumed: 25, cost: 1000, buildTime: 15,
      spriteKey: 'ip_tesla_reactor', sightRange: 6,
    },
    radar_tower: {
      buildingType: 'radar_tower', maxHp: 600, footprintW: 2, footprintH: 2,
      powerProduced: 0, powerConsumed: 50, cost: 1000, buildTime: 15,
      spriteKey: 'ip_tesla_reactor', sightRange: 12,
    },
    battle_lab: {
      buildingType: 'battle_lab', maxHp: 500, footprintW: 2, footprintH: 2,
      powerProduced: 0, powerConsumed: 100, cost: 2000, buildTime: 25,
      spriteKey: 'ip_tesla_reactor', sightRange: 10,
    },
    nuclear_reactor: {
      buildingType: 'nuclear_reactor', maxHp: 600, footprintW: 2, footprintH: 2,
      powerProduced: 1000, powerConsumed: 0, cost: 1000, buildTime: 20,
      spriteKey: 'ip_tesla_reactor', sightRange: 5,
    },
    sentry_gun: {
      buildingType: 'sentry_gun', maxHp: 400, footprintW: 1, footprintH: 1,
      powerProduced: 0, powerConsumed: 0, cost: 400, buildTime: 5,
      spriteKey: 'ip_tesla_reactor', sightRange: 7,
    },
    tesla_coil: {
      buildingType: 'tesla_coil', maxHp: 600, footprintW: 1, footprintH: 1,
      powerProduced: 0, powerConsumed: 75, cost: 1500, buildTime: 15,
      spriteKey: 'ip_tesla_reactor', sightRange: 8,
    },
    flak_cannon: {
      buildingType: 'flak_cannon', maxHp: 500, footprintW: 1, footprintH: 1,
      powerProduced: 0, powerConsumed: 50, cost: 900, buildTime: 10,
      spriteKey: 'ip_tesla_reactor', sightRange: 10,
    },
    wall: {
      buildingType: 'wall', maxHp: 300, footprintW: 1, footprintH: 1,
      powerProduced: 0, powerConsumed: 0, cost: 100, buildTime: 2,
      spriteKey: 'ip_tesla_reactor', sightRange: 1,
    },
  },

  units: {
    conscript: {
      unitType: 'conscript', category: 'infantry', maxHp: 75, speed: 4,
      armor: 'light', damageType: 'bullet', dps: 10, range: 4,
      cost: 100, buildTime: 3, spriteKey: 'ip_conscript_idle_s', sightRange: 6,
    },
    flak_trooper: {
      unitType: 'flak_trooper', category: 'infantry', maxHp: 100, speed: 4,
      armor: 'light', damageType: 'explosive', dps: 15, range: 6,
      cost: 300, buildTime: 5, spriteKey: 'ip_conscript_idle_s', sightRange: 7,
    },
    rpg_trooper: {
      unitType: 'rpg_trooper', category: 'infantry', maxHp: 100, speed: 3,
      armor: 'light', damageType: 'antiArmor', dps: 20, range: 5,
      cost: 300, buildTime: 5, spriteKey: 'ip_conscript_idle_s', sightRange: 6,
    },
    engineer: {
      unitType: 'engineer', category: 'infantry', maxHp: 75, speed: 3,
      armor: 'none', damageType: 'bullet', dps: 0, range: 0,
      cost: 500, buildTime: 8, spriteKey: 'ip_conscript_idle_s', sightRange: 5,
    },
    war_harvester: {
      unitType: 'war_harvester', category: 'vehicle', maxHp: 800, speed: 3,
      armor: 'heavy', damageType: 'bullet', dps: 5, range: 3,
      cost: 1400, buildTime: 15, spriteKey: 'ip_heavy_tank_idle_s', sightRange: 6,
    },
    heavy_tank: {
      unitType: 'heavy_tank', category: 'vehicle', maxHp: 400, speed: 5,
      armor: 'heavy', damageType: 'explosive', dps: 30, range: 5.5,
      cost: 900, buildTime: 10, spriteKey: 'ip_heavy_tank_idle_s', sightRange: 7,
    },
    apocalypse_tank: {
      unitType: 'apocalypse_tank', category: 'heavyVehicle', maxHp: 800, speed: 3,
      armor: 'heavy', damageType: 'explosive', dps: 45, range: 6,
      cost: 1750, buildTime: 18, spriteKey: 'ip_heavy_tank_idle_s', sightRange: 7,
    },
    v3_launcher: {
      unitType: 'v3_launcher', category: 'vehicle', maxHp: 150, speed: 4,
      armor: 'light', damageType: 'missile', dps: 40, range: 12,
      cost: 800, buildTime: 10, spriteKey: 'ip_heavy_tank_idle_s', sightRange: 8,
    },
    mig: {
      unitType: 'mig', category: 'aircraft', maxHp: 150, speed: 14,
      armor: 'light', damageType: 'missile', dps: 25, range: 6,
      cost: 1000, buildTime: 10, spriteKey: 'ip_heavy_tank_idle_s', sightRange: 10,
    },
  },
};

registerFaction(IRON_PACT);
