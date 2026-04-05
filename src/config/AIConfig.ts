/**
 * AI difficulty configurations.
 * Easy → Brutal with increasing aggression, speed, and resource bonuses.
 */

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'brutal';

export interface AIConfig {
  difficulty: AIDifficulty;
  buildSpeedMultiplier: number;    // 1 = normal
  resourceMultiplier: number;      // multiplied to harvester income
  firstAttackTime: number;         // seconds before first attack
  attackInterval: number;          // seconds between attack waves
  maxArmySize: number;             // max units before stopping production
  usesCounterLogic: boolean;       // adapts unit composition to player
  hasFogCheat: boolean;            // can see through fog
  retreatThreshold: number;        // HP% to retreat (0 = never retreat)
}

export const AI_CONFIGS: Record<AIDifficulty, AIConfig> = {
  easy: {
    difficulty: 'easy',
    buildSpeedMultiplier: 0.7,
    resourceMultiplier: 1.0,
    firstAttackTime: 300,       // 5 min
    attackInterval: 180,        // 3 min
    maxArmySize: 15,
    usesCounterLogic: false,
    hasFogCheat: false,
    retreatThreshold: 0,
  },
  medium: {
    difficulty: 'medium',
    buildSpeedMultiplier: 1.0,
    resourceMultiplier: 1.0,
    firstAttackTime: 240,       // 4 min
    attackInterval: 120,
    maxArmySize: 25,
    usesCounterLogic: false,
    hasFogCheat: false,
    retreatThreshold: 0.2,
  },
  hard: {
    difficulty: 'hard',
    buildSpeedMultiplier: 1.3,
    resourceMultiplier: 1.25,
    firstAttackTime: 180,       // 3 min
    attackInterval: 90,
    maxArmySize: 40,
    usesCounterLogic: true,
    hasFogCheat: false,
    retreatThreshold: 0.3,
  },
  brutal: {
    difficulty: 'brutal',
    buildSpeedMultiplier: 1.5,
    resourceMultiplier: 1.5,
    firstAttackTime: 120,       // 2 min
    attackInterval: 60,
    maxArmySize: 60,
    usesCounterLogic: true,
    hasFogCheat: true,
    retreatThreshold: 0.4,
  },
};
