/**
 * Atlantic Coalition (AC) — Blue faction.
 * Playstyle: Precise, tech-heavy, late-game power.
 */

import { registerFaction, type FactionData } from '@/config/FactionRegistry';
import { FACTION_COLORS } from '@/config/GameConfig';

export const ATLANTIC_COALITION: FactionData = {
  id: 'ac',
  name: 'Atlantic Coalition',
  color: FACTION_COLORS.ac,
  economyBonus: 'Ore Purifier (+25% refinery yield)',

  buildings: {
    construction_yard: {
      buildingType: 'construction_yard', maxHp: 1500, footprintW: 3, footprintH: 3,
      powerProduced: 0, powerConsumed: 0, cost: 3000, buildTime: 0,
      spriteKey: 'ac_power_plant', sightRange: 10,
    },
    power_plant: {
      buildingType: 'power_plant', maxHp: 750, footprintW: 2, footprintH: 2,
      powerProduced: 200, powerConsumed: 0, cost: 600, buildTime: 10,
      spriteKey: 'ac_power_plant', sightRange: 5,
    },
    ore_refinery: {
      buildingType: 'ore_refinery', maxHp: 900, footprintW: 3, footprintH: 3,
      powerProduced: 0, powerConsumed: 50, cost: 2000, buildTime: 15,
      spriteKey: 'ac_power_plant', sightRange: 6,
    },
    barracks: {
      buildingType: 'barracks', maxHp: 800, footprintW: 2, footprintH: 2,
      powerProduced: 0, powerConsumed: 10, cost: 500, buildTime: 8,
      spriteKey: 'ac_power_plant', sightRange: 5,
    },
    war_factory: {
      buildingType: 'war_factory', maxHp: 1000, footprintW: 3, footprintH: 3,
      powerProduced: 0, powerConsumed: 25, cost: 2000, buildTime: 20,
      spriteKey: 'ac_power_plant', sightRange: 5,
    },
    air_force_command: {
      buildingType: 'air_force_command', maxHp: 600, footprintW: 2, footprintH: 2,
      powerProduced: 0, powerConsumed: 50, cost: 1000, buildTime: 15,
      spriteKey: 'ac_power_plant', sightRange: 8,
    },
    battle_lab: {
      buildingType: 'battle_lab', maxHp: 500, footprintW: 2, footprintH: 2,
      powerProduced: 0, powerConsumed: 100, cost: 2000, buildTime: 25,
      spriteKey: 'ac_power_plant', sightRange: 10,
    },
    ore_purifier: {
      buildingType: 'ore_purifier', maxHp: 600, footprintW: 2, footprintH: 2,
      powerProduced: 0, powerConsumed: 200, cost: 2500, buildTime: 20,
      spriteKey: 'ac_power_plant', sightRange: 5,
    },
    pillbox: {
      buildingType: 'pillbox', maxHp: 400, footprintW: 1, footprintH: 1,
      powerProduced: 0, powerConsumed: 0, cost: 400, buildTime: 5,
      spriteKey: 'ac_power_plant', sightRange: 7,
    },
    prism_tower: {
      buildingType: 'prism_tower', maxHp: 600, footprintW: 1, footprintH: 1,
      powerProduced: 0, powerConsumed: 75, cost: 1500, buildTime: 15,
      spriteKey: 'ac_power_plant', sightRange: 8,
    },
    patriot_missile: {
      buildingType: 'patriot_missile', maxHp: 500, footprintW: 1, footprintH: 1,
      powerProduced: 0, powerConsumed: 50, cost: 1000, buildTime: 10,
      spriteKey: 'ac_power_plant', sightRange: 10,
    },
    wall: {
      buildingType: 'wall', maxHp: 300, footprintW: 1, footprintH: 1,
      powerProduced: 0, powerConsumed: 0, cost: 100, buildTime: 2,
      spriteKey: 'ac_power_plant', sightRange: 1,
    },
  },

  units: {
    rifleman: {
      unitType: 'rifleman', category: 'infantry', maxHp: 125, speed: 4,
      armor: 'light', damageType: 'bullet', dps: 15, range: 5,
      cost: 200, buildTime: 5, spriteKey: 'ac_rifleman_idle_s', sightRange: 7,
    },
    engineer: {
      unitType: 'engineer', category: 'infantry', maxHp: 75, speed: 3,
      armor: 'none', damageType: 'bullet', dps: 0, range: 0,
      cost: 500, buildTime: 8, spriteKey: 'ac_rifleman_idle_s', sightRange: 5,
    },
    chrono_harvester: {
      unitType: 'chrono_harvester', category: 'vehicle', maxHp: 600, speed: 4,
      armor: 'heavy', damageType: 'bullet', dps: 0, range: 0,
      cost: 1400, buildTime: 15, spriteKey: 'ac_light_tank_idle_s', sightRange: 6,
    },
    light_tank: {
      unitType: 'light_tank', category: 'vehicle', maxHp: 300, speed: 7,
      armor: 'medium', damageType: 'antiArmor', dps: 25, range: 5,
      cost: 700, buildTime: 8, spriteKey: 'ac_light_tank_idle_s', sightRange: 8,
    },
    ifv: {
      unitType: 'ifv', category: 'vehicle', maxHp: 200, speed: 8,
      armor: 'medium', damageType: 'missile', dps: 20, range: 7,
      cost: 800, buildTime: 8, spriteKey: 'ac_light_tank_idle_s', sightRange: 8,
    },
    prism_tank: {
      unitType: 'prism_tank', category: 'vehicle', maxHp: 150, speed: 5,
      armor: 'light', damageType: 'electric', dps: 35, range: 6,
      cost: 1200, buildTime: 12, spriteKey: 'ac_light_tank_idle_s', sightRange: 7,
    },
    raptor: {
      unitType: 'raptor', category: 'aircraft', maxHp: 150, speed: 12,
      armor: 'light', damageType: 'missile', dps: 30, range: 6,
      cost: 1200, buildTime: 12, spriteKey: 'ac_light_tank_idle_s', sightRange: 10,
    },
    nighthawk: {
      unitType: 'nighthawk', category: 'aircraft', maxHp: 175, speed: 8,
      armor: 'light', damageType: 'bullet', dps: 10, range: 5,
      cost: 1000, buildTime: 12, spriteKey: 'ac_light_tank_idle_s', sightRange: 8,
    },
  },
};

registerFaction(ATLANTIC_COALITION);
