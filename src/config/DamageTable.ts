/**
 * Damage multiplier matrix from GAME-BRIEF Section 4.5.
 * Usage: DamageTable[damageType][armorType] → multiplier (0..2)
 */

import type { DamageType, ArmorType } from '@/utils/Types';

export const DamageTable: Record<DamageType, Record<ArmorType, number>> = {
  bullet:   { none: 1.00, light: 0.75, medium: 0.50, heavy: 0.25, building: 0.10 },
  antiArmor:{ none: 0.50, light: 0.75, medium: 1.00, heavy: 1.25, building: 0.75 },
  explosive:{ none: 1.00, light: 1.00, medium: 0.75, heavy: 0.75, building: 1.50 },
  electric: { none: 1.00, light: 1.00, medium: 1.25, heavy: 1.00, building: 0.50 },
  missile:  { none: 0.75, light: 1.00, medium: 1.00, heavy: 1.00, building: 1.25 },
} as const;

/** Calculate final damage after armor multiplier */
export function calculateDamage(baseDamage: number, damageType: DamageType, armorType: ArmorType): number {
  return baseDamage * DamageTable[damageType][armorType];
}
