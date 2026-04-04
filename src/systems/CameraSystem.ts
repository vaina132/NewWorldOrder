import Phaser from 'phaser';
import {
  CAMERA_PAN_SPEED,
  CAMERA_EDGE_SCROLL_ZONE,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_STEP,
  SIDEBAR_WIDTH,
} from '@/config/GameConfig';
import { clamp } from '@/utils/MathUtils';
import type { IsometricTilemap } from '@/rendering/IsometricTilemap';

/**
 * Camera controller: WASD pan, edge scroll, mouse wheel zoom.
 * Accounts for the RA2-style right sidebar offset.
 */
export class CameraController {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private tilemap: IsometricTilemap;
  private keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private currentZoom = 1;

  constructor(scene: Phaser.Scene, tilemap: IsometricTilemap) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.tilemap = tilemap;

    // Set up keyboard input
    const keyboard = scene.input.keyboard!;
    this.keys = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Mouse wheel zoom
    scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _deltaX: number, deltaY: number) => {
      if (deltaY < 0) {
        this.currentZoom = Math.min(CAMERA_ZOOM_MAX, this.currentZoom + CAMERA_ZOOM_STEP);
      } else {
        this.currentZoom = Math.max(CAMERA_ZOOM_MIN, this.currentZoom - CAMERA_ZOOM_STEP);
      }
      this.camera.setZoom(this.currentZoom);
    });

    // Center camera on map initially
    const bounds = tilemap.worldBounds;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    this.camera.centerOn(centerX, centerY);

    // Set camera viewport to account for sidebar
    this.updateViewport();
    scene.scale.on('resize', () => this.updateViewport());
  }

  private updateViewport(): void {
    const { width, height } = this.scene.scale;
    // Game viewport excludes the right sidebar area
    this.camera.setViewport(0, 0, width - SIDEBAR_WIDTH, height);
  }

  update(delta: number): void {
    const speed = (CAMERA_PAN_SPEED / this.currentZoom) * (delta / 1000);
    let dx = 0;
    let dy = 0;

    // WASD keys
    if (this.keys.W.isDown) dy -= speed;
    if (this.keys.S.isDown) dy += speed;
    if (this.keys.A.isDown) dx -= speed;
    if (this.keys.D.isDown) dx += speed;

    // Edge scrolling
    const pointer = this.scene.input.activePointer;
    const { width, height } = this.camera;

    if (pointer.x < CAMERA_EDGE_SCROLL_ZONE) dx -= speed;
    if (pointer.x > width - CAMERA_EDGE_SCROLL_ZONE) dx += speed;
    if (pointer.y < CAMERA_EDGE_SCROLL_ZONE) dy -= speed;
    if (pointer.y > height - CAMERA_EDGE_SCROLL_ZONE) dy += speed;

    // Apply movement
    if (dx !== 0 || dy !== 0) {
      this.camera.scrollX += dx;
      this.camera.scrollY += dy;
      this.clampCamera();
    }
  }

  private clampCamera(): void {
    const bounds = this.tilemap.worldBounds;
    const halfViewW = (this.camera.width / this.currentZoom) / 2;
    const halfViewH = (this.camera.height / this.currentZoom) / 2;

    this.camera.scrollX = clamp(
      this.camera.scrollX,
      bounds.minX - halfViewW,
      bounds.maxX - halfViewW
    );
    this.camera.scrollY = clamp(
      this.camera.scrollY,
      bounds.minY - halfViewH,
      bounds.maxY - halfViewH
    );
  }

  getZoom(): number {
    return this.currentZoom;
  }
}
