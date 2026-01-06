import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { Scene } from "three";
import { World, BLOCK } from "../world/World";
import {
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_EYE_HEIGHT,
} from "../constants/GameConstants";

export class BlockInteraction {
  private raycaster: THREE.Raycaster;
  private camera: PerspectiveCamera;
  private scene: Scene;
  private controls: any;
  private cursorMesh?: THREE.Mesh;
  private crackMesh?: THREE.Mesh;
  private readonly MAX_DISTANCE = 6;

  private getSelectedSlotItem: () => { id: number; count: number };
  private onPlaceBlock?: (
    x: number,
    y: number,
    z: number,
    blockId: number,
  ) => boolean;
  private onOpenCraftingTable?: () => void;

  constructor(
    camera: PerspectiveCamera,
    scene: Scene,
    controls: any,
    getSelectedSlotItem: () => { id: number; count: number },
    onPlaceBlock?: (
      x: number,
      y: number,
      z: number,
      blockId: number,
    ) => boolean,
    onOpenCraftingTable?: () => void,
    cursorMesh?: THREE.Mesh,
    crackMesh?: THREE.Mesh,
  ) {
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;
    this.getSelectedSlotItem = getSelectedSlotItem;
    this.onPlaceBlock = onPlaceBlock;
    this.onOpenCraftingTable = onOpenCraftingTable;
    this.cursorMesh = cursorMesh;
    this.crackMesh = crackMesh;
    this.raycaster = new THREE.Raycaster();
  }

  public interact(world: World): void {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    const hit = intersects.find(
      (i) =>
        i.object !== this.cursorMesh &&
        i.object !== this.crackMesh &&
        i.object !== this.controls.object &&
        (i.object as any).isMesh &&
        !(i.object as any).isItem &&
        !(i.object.parent as any)?.isMob,
    );

    if (hit && hit.distance < this.MAX_DISTANCE) {
      const p = hit.point
        .clone()
        .add(this.raycaster.ray.direction.clone().multiplyScalar(0.01));
      const x = Math.floor(p.x);
      const y = Math.floor(p.y);
      const z = Math.floor(p.z);

      const targetId = world.getBlock(x, y, z);
      if (targetId === BLOCK.CRAFTING_TABLE) {
        if (this.onOpenCraftingTable) {
          this.onOpenCraftingTable();
        }
        return;
      }

      // Place Block
      const slot = this.getSelectedSlotItem();
      if (slot.id !== 0 && slot.count > 0) {
        // Prevent placing non-blocks (e.g. Stick, Tools)
        if (slot.id === BLOCK.STICK || slot.id >= 20) return;

        if (hit.face) {
          const placePos = hit.point
            .clone()
            .add(hit.face.normal.clone().multiplyScalar(0.01));
          const px = Math.floor(placePos.x);
          const py = Math.floor(placePos.y);
          const pz = Math.floor(placePos.z);

          // Check collision with player
          const playerPos = this.controls.object.position;
          const playerMinX = playerPos.x - PLAYER_HALF_WIDTH;
          const playerMaxX = playerPos.x + PLAYER_HALF_WIDTH;
          const playerMinY = playerPos.y - PLAYER_EYE_HEIGHT;
          const playerMaxY = playerPos.y - PLAYER_EYE_HEIGHT + PLAYER_HEIGHT;
          const playerMinZ = playerPos.z - PLAYER_HALF_WIDTH;
          const playerMaxZ = playerPos.z + PLAYER_HALF_WIDTH;

          const blockMinX = px;
          const blockMaxX = px + 1;
          const blockMinY = py;
          const blockMaxY = py + 1;
          const blockMinZ = pz;
          const blockMaxZ = pz + 1;

          if (
            playerMinX < blockMaxX &&
            playerMaxX > blockMinX &&
            playerMinY < blockMaxY &&
            playerMaxY > blockMinY &&
            playerMinZ < blockMaxZ &&
            playerMaxZ > blockMinZ
          ) {
            // Cannot place block inside player
            return;
          }

          if (this.onPlaceBlock) {
            const placed = this.onPlaceBlock(px, py, pz, slot.id);
            if (placed) {
              // Block was placed, inventory will be updated by caller
            }
          }
        }
      }
    }
  }
}
