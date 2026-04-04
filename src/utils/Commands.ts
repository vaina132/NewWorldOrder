/**
 * Command pattern — ALL player actions flow through serializable commands.
 * This is the foundation for multiplayer (Phase 7): client sends commands, server validates.
 * Even in single-player, all state mutations go through CommandSystem.
 */

import type { EntityId, PlayerId, TileCoord } from './Types';

export type GameCommand =
  | MoveCommand
  | AttackCommand
  | AttackMoveCommand
  | StopCommand
  | GuardCommand
  | PatrolCommand
  | BuildCommand
  | PlaceBuildingCommand
  | ProduceUnitCommand
  | CancelProductionCommand
  | SellBuildingCommand
  | SetRallyPointCommand
  | UseSuperweaponCommand
  | CaptureCommand;

export interface MoveCommand {
  type: 'MOVE';
  playerId: PlayerId;
  unitIds: EntityId[];
  target: TileCoord;
  tick: number;
}

export interface AttackCommand {
  type: 'ATTACK';
  playerId: PlayerId;
  unitIds: EntityId[];
  targetId: EntityId;
  tick: number;
}

export interface AttackMoveCommand {
  type: 'ATTACK_MOVE';
  playerId: PlayerId;
  unitIds: EntityId[];
  target: TileCoord;
  tick: number;
}

export interface StopCommand {
  type: 'STOP';
  playerId: PlayerId;
  unitIds: EntityId[];
  tick: number;
}

export interface GuardCommand {
  type: 'GUARD';
  playerId: PlayerId;
  unitIds: EntityId[];
  targetId?: EntityId;
  tick: number;
}

export interface PatrolCommand {
  type: 'PATROL';
  playerId: PlayerId;
  unitIds: EntityId[];
  waypoints: TileCoord[];
  tick: number;
}

export interface BuildCommand {
  type: 'BUILD';
  playerId: PlayerId;
  buildingType: string;
  tick: number;
}

export interface PlaceBuildingCommand {
  type: 'PLACE_BUILDING';
  playerId: PlayerId;
  buildingType: string;
  position: TileCoord;
  tick: number;
}

export interface ProduceUnitCommand {
  type: 'PRODUCE_UNIT';
  playerId: PlayerId;
  unitType: string;
  factoryId: EntityId;
  tick: number;
}

export interface CancelProductionCommand {
  type: 'CANCEL_PRODUCTION';
  playerId: PlayerId;
  factoryId: EntityId;
  tick: number;
}

export interface SellBuildingCommand {
  type: 'SELL_BUILDING';
  playerId: PlayerId;
  buildingId: EntityId;
  tick: number;
}

export interface SetRallyPointCommand {
  type: 'SET_RALLY_POINT';
  playerId: PlayerId;
  buildingId: EntityId;
  target: TileCoord;
  tick: number;
}

export interface UseSuperweaponCommand {
  type: 'USE_SUPERWEAPON';
  playerId: PlayerId;
  superweaponId: EntityId;
  target: TileCoord;
  tick: number;
}

export interface CaptureCommand {
  type: 'CAPTURE';
  playerId: PlayerId;
  engineerId: EntityId;
  targetBuildingId: EntityId;
  tick: number;
}
