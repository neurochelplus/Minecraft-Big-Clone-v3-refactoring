import * as THREE from "three";
import { Renderer } from "./Renderer";
import { GameState } from "./GameState";
import { World } from "../World";
import { Environment } from "../Environment";
import { ItemEntity } from "../ItemEntity";
import { MobManager } from "../MobManager";
import { PlayerHand } from "../PlayerHand";
import { PlayerPhysics } from "../player/PlayerPhysics";
import { PlayerHealth } from "../player/PlayerHealth";
import { PlayerCombat } from "../player/PlayerCombat";
import { BlockCursor } from "../blocks/BlockCursor";
import { BlockBreaking } from "../blocks/BlockBreaking";
import { BlockInteraction } from "../blocks/BlockInteraction";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { CraftingSystem } from "../crafting/CraftingSystem";
import { CraftingUI } from "../crafting/CraftingUI";

/**
 * Главный класс игры, координирующий все системы
 */
export class Game {
  public renderer: Renderer;
  public gameState: GameState;
  public world: World;
  public environment: Environment;
  public entities: ItemEntity[];
  public mobManager: MobManager;
  public playerHand: PlayerHand;
  public playerPhysics: PlayerPhysics;
  public playerHealth: PlayerHealth;
  public playerCombat: PlayerCombat;
  public blockCursor: BlockCursor;
  public blockBreaking: BlockBreaking;
  public blockInteraction: BlockInteraction;
  public inventory: Inventory;
  public inventoryUI: InventoryUI;
  public craftingSystem: CraftingSystem;
  public craftingUI: CraftingUI;

  public isAttackPressed: boolean = false;

  private prevTime: number = performance.now();
  private animationId: number | null = null;

  constructor(
    renderer: Renderer,
    gameState: GameState,
    world: World,
    environment: Environment,
    entities: ItemEntity[],
    mobManager: MobManager,
    playerHand: PlayerHand,
    playerPhysics: PlayerPhysics,
    playerHealth: PlayerHealth,
    playerCombat: PlayerCombat,
    blockCursor: BlockCursor,
    blockBreaking: BlockBreaking,
    blockInteraction: BlockInteraction,
    inventory: Inventory,
    inventoryUI: InventoryUI,
    craftingSystem: CraftingSystem,
    craftingUI: CraftingUI,
  ) {
    this.renderer = renderer;
    this.gameState = gameState;
    this.world = world;
    this.environment = environment;
    this.entities = entities;
    this.mobManager = mobManager;
    this.playerHand = playerHand;
    this.playerPhysics = playerPhysics;
    this.playerHealth = playerHealth;
    this.playerCombat = playerCombat;
    this.blockCursor = blockCursor;
    this.blockBreaking = blockBreaking;
    this.blockInteraction = blockInteraction;
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
    this.craftingSystem = craftingSystem;
    this.craftingUI = craftingUI;
  }

  /**
   * Запуск игрового цикла
   */
  public start(): void {
    if (this.animationId !== null) {
      return; // Already started
    }
    this.prevTime = performance.now();
    this.animate();
  }

  /**
   * Остановка игрового цикла
   */
  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public resetTime(): void {
    this.prevTime = performance.now();
  }

  /**
   * Основной игровой цикл
   */
  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.gameState.getPaused()) {
      this.renderer.renderOnlyMain();
      return;
    }

    this.update();
    this.render();
  };

  /**
   * Обновление игрового состояния
   */
  private update(): void {
    const time = performance.now();
    const delta = (time - this.prevTime) / 1000;

    // World & Environment
    this.world.update(this.renderer.controls.object.position);
    this.environment.update(delta, this.renderer.controls.object.position);

    // Player Hand Update
    const isMoving =
      (this.playerPhysics.moveForward ||
        this.playerPhysics.moveBackward ||
        this.playerPhysics.moveLeft ||
        this.playerPhysics.moveRight) &&
      this.playerPhysics.isOnGround;
    this.playerHand.update(delta, isMoving);

    // Block Breaking
    this.blockBreaking.update(time, this.world);

    // Attack / Mining
    if (this.isAttackPressed && this.gameState.getGameStarted()) {
      if (!this.blockBreaking.isBreakingNow())
        this.blockBreaking.start(this.world);
      this.playerCombat.performAttack();
    }

    // Entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      entity.update(time / 1000, delta);

      if (entity.isDead) {
        this.entities.splice(i, 1);
        continue;
      }

      if (
        entity.mesh.position.distanceTo(
          this.renderer.controls.object.position,
        ) < 2.5
      ) {
        // Pickup logic
        const added = this.inventory.addItem(entity.type, 1);
        if (added) {
          entity.dispose();
          this.entities.splice(i, 1);
          this.inventoryUI.refresh();
          if (this.inventoryUI.onInventoryChange)
            this.inventoryUI.onInventoryChange();
        }
      }
    }

    // Mobs
    this.mobManager.update(
      delta,
      this.renderer.controls.object.position,
      this.environment,
      (amt) => this.playerHealth.takeDamage(amt),
    );

    // Cursor
    if (this.gameState.getGameStarted()) {
      this.blockCursor.update(this.world);
    }

    // Physics
    if (this.gameState.getGameStarted()) {
      // Safety: Don't apply physics if the current chunk isn't loaded yet
      if (
        !this.world.isChunkLoaded(
          this.renderer.controls.object.position.x,
          this.renderer.controls.object.position.z,
        )
      ) {
        this.prevTime = time;
        return;
      }

      this.playerPhysics.update(delta);
    }

    this.prevTime = time;
  }

  private render(): void {
    this.renderer.render();
  }
}
