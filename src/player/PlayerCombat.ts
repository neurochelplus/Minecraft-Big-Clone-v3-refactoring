import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { ATTACK_RANGE, ATTACK_COOLDOWN } from "../constants/GameConstants";
import { BLOCK } from "../world/World";

export class PlayerCombat {
  private raycaster: THREE.Raycaster;
  private camera: PerspectiveCamera;
  private scene: THREE.Scene;
  private controls: PointerLockControls;
  private lastAttackTime: number = 0;
  private getSelectedSlotItem: () => number;
  private cursorMesh?: THREE.Mesh;
  private crackMesh?: THREE.Mesh;

  constructor(
    camera: PerspectiveCamera,
    scene: THREE.Scene,
    controls: PointerLockControls,
    getSelectedSlotItem: () => number,
    cursorMesh?: THREE.Mesh,
    crackMesh?: THREE.Mesh,
  ) {
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;
    this.getSelectedSlotItem = getSelectedSlotItem;
    this.raycaster = new THREE.Raycaster();
    this.cursorMesh = cursorMesh;
    this.crackMesh = crackMesh;
  }

  private calculateDamage(toolId: number): number {
    if (toolId === 20) return 4; // Wood Sword
    if (toolId === 21) return 5; // Stone Sword
    if (toolId === 24) return 3; // Wood Axe
    if (toolId === 25) return 4; // Stone Axe
    if (toolId === 22) return 2; // Wood Pick
    if (toolId === 23) return 3; // Stone Pick
    if (toolId === 26) return 1.5; // Wood Shovel
    if (toolId === 27) return 2.5; // Stone Shovel
    return 1; // Punch
  }

  public performAttack(): boolean {
    const now = Date.now();
    if (now - this.lastAttackTime < ATTACK_COOLDOWN) return false;
    this.lastAttackTime = now;

    const toolId = this.getSelectedSlotItem();
    const damage = this.calculateDamage(toolId);

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true,
    );

    for (const hit of intersects) {
      if (hit.distance > ATTACK_RANGE) break;

      // Check if it's a mob or part of a mob
      let obj: THREE.Object3D | null = hit.object;
      let isMob = false;
      while (obj) {
        if (obj.userData && obj.userData.mob) {
          isMob = true;
          break;
        }
        obj = obj.parent;
      }

      if (isMob && obj) {
        obj.userData.mob.takeDamage(damage, this.controls.object.position);
        return true; // Hit mob
      }

      // If we hit something else (like a block) that isn't ignored
      if (
        hit.object !== this.cursorMesh &&
        hit.object !== this.crackMesh &&
        hit.object !== this.controls.object &&
        (hit.object as any).isMesh &&
        !(hit.object as any).isItem
      ) {
        // We hit a wall/block before any mob
        return false;
      }
    }

    return false;
  }
}
