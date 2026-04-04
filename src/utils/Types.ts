/**
 * Branded types to prevent mixing different ID types.
 * EntityId, PlayerId, and TileCoord are distinct at the type level.
 */

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

/** Unique identifier for game entities (units, buildings, projectiles) */
export type EntityId = Brand<number, 'EntityId'>;

/** Unique identifier for players */
export type PlayerId = Brand<number, 'PlayerId'>;

/** Tile coordinate on the isometric grid */
export interface TileCoord {
  readonly tileX: number;
  readonly tileY: number;
}

/** World (pixel) coordinate */
export interface WorldCoord {
  readonly x: number;
  readonly y: number;
}

/** Screen (canvas) coordinate */
export interface ScreenCoord {
  readonly screenX: number;
  readonly screenY: number;
}

/** Faction identifiers */
export type FactionId = 'ac' | 'ip';

/** Nation identifiers */
export type NationId = 'usa' | 'israel' | 'uk' | 'russia' | 'china' | 'iran';

/** Damage types from the damage matrix */
export type DamageType = 'bullet' | 'antiArmor' | 'explosive' | 'electric' | 'missile';

/** Armor types from the damage matrix */
export type ArmorType = 'none' | 'light' | 'medium' | 'heavy' | 'building';

/** Entity categories */
export type EntityKind = 'unit' | 'building' | 'projectile' | 'techBuilding';

/** Unit sub-categories */
export type UnitCategory = 'infantry' | 'vehicle' | 'heavyVehicle' | 'aircraft' | 'naval';

/** 8 isometric directions */
export type Direction = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

/** Terrain tile types */
export type TerrainType = 'grass' | 'desert' | 'water' | 'road' | 'ore' | 'cliff' | 'bridge';

/** Fog of war states */
export type FogState = 'black' | 'shroud' | 'visible';

/** Power states */
export type PowerState = 'full' | 'low' | 'off';

// Factory functions for branded types
export function entityId(id: number): EntityId {
  return id as EntityId;
}

export function playerId(id: number): PlayerId {
  return id as PlayerId;
}

export function tileCoord(tileX: number, tileY: number): TileCoord {
  return { tileX, tileY };
}

export function worldCoord(x: number, y: number): WorldCoord {
  return { x, y };
}
